"""Upload finished videos (and covers) to the Cloudflare R2 bucket, so Instagram can fetch them from
a public URL. Credentials come from .env (R2_*) and are never printed.

Usage: tools/publish/.venv/bin/python tools/publish/r2_upload.py <file> [file ...]
       (keys: <story>/<file name>, e.g. layoff/layoff-instagram-reels.mp4; prints the public URLs)
       --delete <key> [key ...]   removes objects again (e.g. after Instagram has published)
"""
import mimetypes
import pathlib
import sys

import boto3
import requests

ROOT = pathlib.Path(__file__).resolve().parents[2]
UA = {"User-Agent": "pencilstories-publisher/1.0"}  # r2.dev rejects Python's default client name


def env():
    vals = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"]
    missing = [k for k in need if not vals.get(k)]
    if missing:
        raise SystemExit(f"missing in .env: {', '.join(missing)}")
    return vals


def client(e):
    return boto3.client("s3", endpoint_url=f"https://{e['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                        aws_access_key_id=e["R2_ACCESS_KEY_ID"], aws_secret_access_key=e["R2_SECRET_ACCESS_KEY"],
                        region_name="auto")


def upload(paths):
    e = env()
    s3, pub = client(e), e["R2_PUBLIC_URL"].rstrip("/")
    for p in map(pathlib.Path, paths):
        story = p.resolve().parent.name  # out/<story>/<file>
        key = f"{story}/{p.name}"
        ctype = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        s3.upload_file(str(p), e["R2_BUCKET"], key, ExtraArgs={"ContentType": ctype})
        url = f"{pub}/{key}"
        r = requests.head(url, headers=UA, timeout=30)
        size = int(r.headers.get("content-length", -1))
        ok = r.status_code == 200 and size == p.stat().st_size
        print(f"{'OK ' if ok else 'BAD'} {url}  ({size / 1e6:.1f} MB, {r.headers.get('content-type')}, HTTP {r.status_code})")


def delete(keys):
    e = env()
    s3 = client(e)
    for k in keys:
        s3.delete_object(Bucket=e["R2_BUCKET"], Key=k)
        print("deleted", k)


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    delete(args[1:]) if args[0] == "--delete" else upload(args)
