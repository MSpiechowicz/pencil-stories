"""Compose an instrumental score with Eleven Music, cut to the video's section timings.

Usage: npx tsx scripts/export-timeline.ts && tools/tts/.venv-cb/bin/python tools/eleven/music.py [seed ...]
Writes public/<story>/music/score.m4a (loudness-matched) and keeps the raw mp3 next to it.
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import ROOT, call, credits  # noqa: E402
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from story_paths import MUSIC, SCORE, TIMELINE  # noqa: E402
from audio import MUSIC_EQ, level  # noqa: E402
import numpy as np  # noqa: E402

tl = json.loads(TIMELINE.read_text())
MUSIC.mkdir(parents=True, exist_ok=True)
m, total = tl["marks"], tl["total"]
NO_VOCALS = ["vocals", "singing", "choir", "lyrics", "spoken word", "drums heavy", "electronic beat", "trap",
             "risers", "whoosh", "sweeps", "sound effects", "reverse cymbal", "sudden swells"]
BASE = ["cinematic", "emotional", "solo felt piano", "instrumental", "intimate", "great production quality", "warm room reverb"]
sections = [
    # the hook (0 .. start): a quiet, serious opening that flows straight into the Year 1 theme
    (0, m["start"], "[Opening] {starts immediately: a slow, continuous low piano motif over a soft sustained string pad, serious, playing all the way through and flowing straight into the theme}",
     BASE + ["starts immediately", "serious", "continuous slow piano motif", "soft sustained string pad", "slow tempo 70 bpm", "seamless", "legato", "steady level"]),
    (m["start"], m["email"], "[Intro] {soft warm piano theme continues, hopeful}", BASE + ["gentle", "hopeful", "slow tempo 70 bpm", "major key", "continuous"]),
    (m["email"], m["night"], "[Verse] {the piano turns melancholic}", ["melancholic", "minor key", "piano", "sparse", "slowly sinking", "sad"]),
    (m["night"], m["voice"], "[Breakdown] {lonely single notes, lots of space}", ["very sparse", "dark", "lonely", "single piano notes", "quiet", "minor key"]),
    (m["voice"], m.get("familyb", m["family"]), "[Pause] {almost silence, one fragile high note}", ["near silence", "one fragile high piano note", "very quiet", "tender"]),
    (m.get("familyb", m["family"]), m["study"], "[Bridge] {warm low strings enter under the piano}", ["tender", "warm low strings", "piano", "hope beginning", "major key", "emotional"]),
    (m["study"], m["yes"], "[Build] {steady determined rhythm grows}", ["determined", "building", "piano ostinato", "strings", "soft percussion", "rising energy", "major key"]),
    (m["yes"], tl["outro"], "[Climax] {uplifting triumphant peak}", ["uplifting", "triumphant", "full strings", "piano", "cinematic swell", "major key", "emotional release"]),
    (tl["outro"], total, "[Outro] {calm warm resolution, fade out}", ["calm", "warm", "resolving", "final chord", "fade out", "piano and strings"]),
]
# sections shorter than the API minimum (3 s) borrow time from the section before them,
# so short but important moments (the near-silence at the daughter's question) keep their own chunk
sections = [list(x) for x in sections]
for i in range(len(sections) - 1, 0, -1):  # backwards, so borrowing can cascade
    short_by = 3.05 - (sections[i][1] - sections[i][0])
    if short_by > 0:
        sections[i - 1][1] -= short_by
        sections[i][0] -= short_by
chunks = []
for a, b, text, styles in sections:
    ms = int(round((b - a) * 1000))
    if ms < 3000:  # API minimum: fold short sections into the previous one
        chunks[-1]["duration_ms"] += ms
        continue
    chunks.append({"text": text, "duration_ms": ms, "positive_styles": styles, "negative_styles": NO_VOCALS})
print("sections:", [(c["text"].split("]")[0] + "]", round(c["duration_ms"] / 1000, 1)) for c in chunks], "total", sum(c["duration_ms"] for c in chunks) / 1000)

BOUNDS = [0.0]
for c in chunks:
    BOUNDS.append(BOUNDS[-1] + c["duration_ms"] / 1000)


def jumps(path):
    """Sustained swells ("whoops"): the next second is >10 dB louder than the second before,
    away from a planned section boundary. Single piano-note attacks don't count."""
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, np.int16).astype(float) / 32768
    sr = 8000

    def db(t0, t1):
        seg = a[max(0, int(t0 * sr)):int(t1 * sr)]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) if len(seg) else -99

    bad = []
    t = 1.5
    while t < len(a) / sr - 1.0:
        if t > 3 and db(t, t + 1.0) - db(t - 1.2, t - 0.2) > 10 and all(abs(t - b) > 1.2 for b in BOUNDS):
            if not bad or t - bad[-1] > 1.0:
                bad.append(round(t, 2))
        t += 0.25
    return bad


def gaps(path):
    """Silence where music should be playing: the start (seconds until the music is audible) and
    dropouts (>= 1 s below -45 dB) outside the planned near-silence at the daughter's question."""
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, np.int16).astype(float) / 32768
    sr, step = 8000, 0.25
    lv = [20 * np.log10(np.sqrt(np.mean(a[int(t * sr):int((t + step) * sr)] ** 2)) + 1e-9)
          for t in np.arange(0, len(a) / sr - step, step)]
    lead = next((i * step for i, v in enumerate(lv) if v > -40), 99.0)
    quiet_ok = (m["voice"] - 1.5, m.get("familyb", m["family"]) + 4.0)
    drops, run = [], 0
    for i, v in enumerate(lv):
        t = i * step
        run = run + 1 if v < -45 and t > lead and not (quiet_ok[0] <= t <= quiet_ok[1]) and t < tl["outro"] else 0
        if run * step == 1.0:
            drops.append(round(t - 0.75, 2))
    # the opening (under the hook and the glide into Year 1) must keep playing, not fade to a tail
    open_floor = min((lv[i] for i in range(int(1 / step), int(m["start"] / step))), default=0)
    if open_floor < -36:
        lead = max(lead, 9.0)  # a fading opening counts like a late start
        print(f"  opening fades to {open_floor:.0f} dB", flush=True)
    return lead, drops


used0, limit, _ = credits()
seeds = [int(a) for a in sys.argv[1:]] or [11, 23, 37, 51, 67, 89]
raw = MUSIC / f"{SCORE.stem}-raw.mp3"  # per version: score-raw.mp3 / score-short-raw.mp3
best = None
for seed in seeds:
    body = {"composition_plan": {"chunks": chunks}, "model_id": "music_v2_5", "seed": seed}
    cand = MUSIC / f"{SCORE.stem}-raw-seed{seed}.mp3"
    if cand.exists() and cand.stat().st_mtime > TIMELINE.stat().st_mtime:
        print(f"seed {seed}: reusing the take already composed for this timeline", flush=True)
    else:
        cand.write_bytes(call("POST", "/v1/music", body, query="output_format=mp3_48000_192", raw=True, timeout=900))
    lead, drops = gaps(cand)
    bad = jumps(cand)
    # a late start or a dropout is audible; a phrase that comes back after a dropout is not a swell
    score = (20 if lead > 0.4 else 0) + 5 * len(drops) + len([j for j in bad if all(abs(j - d) > 2.5 for d in drops)])
    print(f"seed {seed}: starts at {lead:.2f}s, dropouts at {drops or 'none'}, jumps at {bad or 'none'} -> score {score}", flush=True)
    if best is None or score < best[1]:
        best = (cand, score, seed)
    if score == 0:
        break
best[0].replace(raw)
level(raw, SCORE, -20, MUSIC_EQ, ("-c:a", "aac", "-b:a", "192k"))
used1, _, _ = credits()
dur = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(raw)]).decode().strip()
print(f"kept seed {best[2]} -> {SCORE.relative_to(ROOT)} ({dur}s), credits used: {used1 - used0}  (now {used1}/{limit})")
