"""Publish a story's finished videos: YouTube (16:9), YouTube Shorts and Instagram Reels.

    npm run publish -- <story> [--youtube] [--shorts] [--instagram] [--go]
                     [--privacy private|unlisted|public] [--publish-at 2026-12-01T18:00:00Z] [--force]
    npm run publish -- <story> --set-thumbnail --go     (after verifying the channel: youtube.com/verify)
    npm run publish -- <story> --status                 (YouTube's processing status of the uploads)

Without --go nothing is uploaded: it checks every file and credential and prints exactly what
would be posted (a dry run). Without platform flags, all three are selected.

Per story it reads src/stories/<story>/publish.json (titles, descriptions, captions, files) and
records what it posted in out/<story>/published.json, so the same video is never posted twice
(--force overrides).

YouTube: OAuth "Desktop app" client in secrets/youtube_client_secret.json; the first run opens a
browser to sign in (pick the PencilStories channel) and keeps the token in secrets/youtube_token.json.
--privacy defaults to private (review it in Studio, then make it public); --publish-at schedules it
(YouTube publishes it at that UTC time). Until Google approves the API audit, uploads made through
the API stay private whatever is asked. After each upload it waits (up to 10 min) for YouTube to
process the video and reports whether it was processed or rejected (videos.list, youtube.readonly).

Instagram: INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN in .env. Instagram fetches the video from a
public URL, so the Reel and its cover are first uploaded to Cloudflare R2 (R2_* in .env); the video
is removed from R2 again once Instagram has published it. Instagram publishes immediately.
Secrets are never printed.
"""
import argparse
import datetime as dt
import json
import pathlib
import sys
import time

import requests

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import r2_upload  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
SECRETS = ROOT / "secrets"
YT_SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
GRAPH = "https://graph.facebook.com/v21.0"


def log_path(story):
    return ROOT / "out" / story / "published.json"


def load_log(story):
    p = log_path(story)
    return json.loads(p.read_text()) if p.exists() else {}


def save_log(story, log):
    log_path(story).write_text(json.dumps(log, indent=2))


def check_file(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"missing file: {rel} (render it first: npm run render)")
    return p


# ---------------------------------------------------------------- YouTube

def youtube_client():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    secret, token = SECRETS / "youtube_client_secret.json", SECRETS / "youtube_token.json"
    if not secret.exists():
        raise SystemExit("missing secrets/youtube_client_secret.json (Google Cloud > Credentials > OAuth client, Desktop app)")
    creds = Credentials.from_authorized_user_file(str(token), YT_SCOPES) if token.exists() else None
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception:
            creds = None  # refresh token expired (apps in "Testing" lose it after 7 days): sign in again
    if not creds or not creds.valid:
        print("Opening the browser to sign in to YouTube: choose the PencilStories channel.")
        creds = InstalledAppFlow.from_client_secrets_file(str(secret), YT_SCOPES).run_local_server(port=0)
        token.write_text(creds.to_json())
        token.chmod(0o600)
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def youtube_upload(yt, meta, privacy, publish_at):
    from googleapiclient.http import MediaFileUpload

    status = {"privacyStatus": "private" if publish_at else privacy, "selfDeclaredMadeForKids": False}
    if publish_at:
        status["publishAt"] = publish_at
    body = {"snippet": {"title": meta["title"], "description": meta["description"], "tags": meta.get("tags", []),
                        "categoryId": meta.get("category", "1"), "defaultLanguage": "en", "defaultAudioLanguage": "en"},
            "status": status}
    media = MediaFileUpload(str(ROOT / meta["file"]), mimetype="video/mp4", chunksize=16 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        st, resp = req.next_chunk()
        if st:
            print(f"  uploading {st.progress() * 100:3.0f}%", flush=True)
    vid = resp["id"]
    if meta.get("thumbnail"):
        try:
            yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(ROOT / meta["thumbnail"]), mimetype="image/png")).execute()
            print("  thumbnail set")
        except Exception as e:  # custom thumbnails need a phone-verified channel
            print(f"  thumbnail not set ({str(e)[:160]}); verify the channel at youtube.com/verify, then set it in Studio")
    final = youtube_wait_processed(yt, vid)
    return {"id": vid, "url": f"https://youtu.be/{vid}", "privacy": resp["status"].get("privacyStatus"),
            "publish_at": publish_at, "upload_status": final.get("upload")}


def youtube_status(yt, ids):
    """Read the processing state of our own uploaded videos (videos.list, scope youtube.readonly)."""
    resp = yt.videos().list(part="status,processingDetails", id=",".join(ids)).execute()
    out = {}
    for item in resp.get("items", []):
        st, pd = item.get("status", {}), item.get("processingDetails", {})
        out[item["id"]] = {
            "upload": st.get("uploadStatus"),          # uploaded (still processing) / processed / failed / rejected / deleted
            "privacy": st.get("privacyStatus"),
            "publish_at": st.get("publishAt"),
            "processing": pd.get("processingStatus"),  # processing / succeeded / failed / terminated
            "problem": st.get("rejectionReason") or st.get("failureReason") or pd.get("processingFailureReason"),
        }
    return out


def describe_status(s):
    text = f"{s['upload']}, privacy {s['privacy']}"
    if s.get("publish_at"):
        text += f", scheduled for {s['publish_at']}"
    if s.get("problem"):
        text += f", PROBLEM: {s['problem']}"
    return text


def youtube_wait_processed(yt, vid, timeout=600, every=15):
    """After an upload, wait until YouTube has processed (or rejected) the video and report it."""
    end = time.monotonic() + timeout
    while True:
        s = youtube_status(yt, [vid]).get(vid)
        if s is None:
            print("  status: video not found (deleted?)")
            return {}
        if s["upload"] != "uploaded" or time.monotonic() > end:
            break
        print(f"  YouTube is processing the video ({s.get('processing') or 'processing'})...", flush=True)
        time.sleep(every)
    if s["upload"] == "uploaded":
        print("  still processing after 10 min; check later with --status")
    else:
        print(f"  status: {describe_status(s)}")
    return s


# ---------------------------------------------------------------- Instagram

def ig_env():
    e = r2_upload.env()  # also checks the R2 settings Instagram needs
    vals = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN"):
        if not vals.get(k):
            raise SystemExit(f"missing in .env: {k}")
    return vals["INSTAGRAM_USER_ID"], vals["INSTAGRAM_ACCESS_TOKEN"], e


def graph(method, path, token, **params):
    params["access_token"] = token
    r = requests.request(method, f"{GRAPH}/{path}", params=params, timeout=60)
    data = r.json()
    if "error" in data:
        raise SystemExit(f"Instagram {path}: {data['error'].get('message')}")
    return data


def instagram_account(uid, token):
    return graph("GET", uid, token, fields="username")["username"]


def instagram_publish(story, meta):
    uid, token, e = ig_env()
    pub = e["R2_PUBLIC_URL"].rstrip("/")
    files = [ROOT / meta["file"]] + ([ROOT / meta["cover"]] if meta.get("cover") else [])
    r2_upload.upload([str(f) for f in files])
    video_url = f"{pub}/{story}/{files[0].name}"
    params = {"media_type": "REELS", "video_url": video_url, "caption": meta["caption"], "share_to_feed": "true"}
    if meta.get("cover"):
        params["cover_url"] = f"{pub}/{story}/{files[1].name}"
    container = graph("POST", f"{uid}/media", token, **params)["id"]
    print("  Instagram is processing the video", end="", flush=True)
    for _ in range(90):  # up to ~15 minutes
        st = graph("GET", container, token, fields="status_code,status")
        if st["status_code"] == "FINISHED":
            break
        if st["status_code"] in ("ERROR", "EXPIRED"):
            raise SystemExit(f"\n  Instagram could not process the video: {st.get('status')}")
        print(".", end="", flush=True)
        time.sleep(10)
    else:
        raise SystemExit("\n  Instagram is still processing after 15 minutes; nothing was published")
    print()
    media_id = graph("POST", f"{uid}/media_publish", token, creation_id=container)["id"]
    link = graph("GET", media_id, token, fields="permalink").get("permalink")
    r2_upload.delete([f"{story}/{files[0].name}"])  # Instagram keeps its own copy
    return {"id": media_id, "url": link}


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("story")
    ap.add_argument("--youtube", action="store_true")
    ap.add_argument("--shorts", action="store_true")
    ap.add_argument("--instagram", action="store_true")
    ap.add_argument("--go", action="store_true", help="really publish (otherwise a dry run)")
    ap.add_argument("--privacy", default="private", choices=["private", "unlisted", "public"])
    ap.add_argument("--publish-at", help="schedule the YouTube uploads (UTC, e.g. 2026-12-01T18:00:00Z)")
    ap.add_argument("--force", action="store_true", help="post again even if the log says it was posted")
    ap.add_argument("--set-thumbnail", action="store_true",
                    help="only (re)set the custom thumbnail of the already uploaded YouTube video")
    ap.add_argument("--status", action="store_true",
                    help="only show YouTube's processing status of this story's uploaded videos (read-only)")
    a = ap.parse_args()
    targets = [t for t in ("youtube", "shorts", "instagram") if getattr(a, t)] or ["youtube", "shorts", "instagram"]
    if a.publish_at:
        when = dt.datetime.fromisoformat(a.publish_at.replace("Z", "+00:00"))
        if when.tzinfo is None or when <= dt.datetime.now(dt.timezone.utc):
            raise SystemExit("--publish-at must be a future UTC time like 2026-12-01T18:00:00Z")

    cfg_path = ROOT / "src/stories" / a.story / "publish.json"
    if not cfg_path.exists():
        raise SystemExit(f"missing {cfg_path.relative_to(ROOT)} (copy src/stories/layoff/publish.json)")
    cfg = json.loads(cfg_path.read_text())
    log = load_log(a.story)
    if a.status:
        posted = {t: log[t]["id"] for t in ("youtube", "shorts") if log.get(t, {}).get("id")}
        if not posted:
            raise SystemExit("no uploaded YouTube videos in the log for this story")
        found = youtube_status(youtube_client(), list(posted.values()))
        for t, vid in posted.items():
            s = found.get(vid)
            print(f"[{t}] https://youtu.be/{vid}: {describe_status(s) if s else 'not found (deleted?)'}")
        return
    if a.set_thumbnail:
        from googleapiclient.http import MediaFileUpload
        vid, thumb = log.get("youtube", {}).get("id"), cfg["youtube"].get("thumbnail")
        if not vid or not thumb:
            raise SystemExit("no uploaded YouTube video (or no thumbnail) in the log for this story")
        check_file(thumb)
        if not a.go:
            print(f"DRY RUN: would set {thumb} as the thumbnail of https://youtu.be/{vid} (add --go)")
            return
        youtube_client().thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(ROOT / thumb), mimetype="image/png")).execute()
        print(f"thumbnail set: https://youtu.be/{vid}")
        return

    print(f"{'PUBLISHING' if a.go else 'DRY RUN (add --go to publish)'}: {a.story} -> {', '.join(targets)}\n")
    plan = []
    for t in targets:
        meta = cfg[t]
        f = check_file(meta["file"])
        for extra in ("thumbnail", "cover"):
            if meta.get(extra):
                check_file(meta[extra])
        done = log.get(t)
        if done and not a.force:
            print(f"[{t}] already posted {done.get('posted')}: {done.get('url')}  (skipping; --force to post again)\n")
            continue
        if t == "instagram":
            uid, token, _ = ig_env()
            who = "@" + instagram_account(uid, token)
            words = meta["caption"]
            how = "publishes immediately (Instagram has no scheduling in the API)"
        else:
            who = "YouTube (sign-in on first run)"
            words = f"{meta['title']}\n{meta['description']}"
            how = f"scheduled for {a.publish_at}" if a.publish_at else f"privacy: {a.privacy}"
        print(f"[{t}] {f.relative_to(ROOT)} ({f.stat().st_size / 1e6:.1f} MB) -> {who}, {how}")
        print("    " + words.replace("\n", "\n    ") + "\n")
        if t == "shorts":
            print("    NOTE: the Short's thumbnail must be picked by hand afterwards (the API cannot set it)\n")
        plan.append(t)
    if not a.go or not plan:
        return

    yt = None
    for t in plan:
        meta = cfg[t]
        print(f"[{t}] publishing...")
        if t == "instagram":
            res = instagram_publish(a.story, meta)
        else:
            yt = yt or youtube_client()
            res = youtube_upload(yt, meta, a.privacy, a.publish_at)
        res["posted"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        log[t] = res
        save_log(a.story, log)
        print(f"[{t}] done: {res['url']}\n")
        if t == "shorts":
            # the API cannot give a Short a custom thumbnail (thumbnails.set is ignored for Shorts);
            # it has to be picked by hand in the YouTube app or Studio
            print(f"[shorts] SET THE COVER BY HAND: YouTube app or Studio -> {res['url']} -> Edit -> Thumbnail "
                  f"(pick a frame; the API cannot set a Short's thumbnail)\n")


if __name__ == "__main__":
    main()
