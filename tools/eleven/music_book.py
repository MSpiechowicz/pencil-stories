"""Score for a "The Missing Piece" cut with Eleven Music, cut to the story's turns.

Usage: VARIANT=shorts|youtube npx tsx scripts/export-book-timeline.ts &&
       VARIANT=shorts|youtube tools/tts/.venv-cb/bin/python tools/eleven/music_book.py [seed]
ONE take per run (credits!): it is checked automatically (late start, dropouts, sudden swells);
if it fails, run again with another seed. Writes public/missing-piece/music/score-shorts.m4a.
"""
import json
import os
import pathlib
import subprocess
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import ROOT, call, credits  # noqa: E402
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from audio import MUSIC_EQ, level  # noqa: E402

VARIANT = os.environ.get("VARIANT", "shorts")
TIMELINE = ROOT / f"out/missing-piece/timeline-{VARIANT}.json"
MUSIC = ROOT / "public/missing-piece/music"
SCORE = MUSIC / f"score-{VARIANT}.m4a"
tl = json.loads(TIMELINE.read_text())
m, total = tl["marks"], tl["total"]
MUSIC.mkdir(parents=True, exist_ok=True)

NO = ["vocals", "singing", "choir", "lyrics", "spoken word", "drums heavy", "electronic beat", "trap",
      "risers", "whoosh", "sweeps", "sound effects", "reverse cymbal", "sudden swells"]
BASE = ["cinematic", "emotional", "solo felt piano", "instrumental", "intimate", "warm room reverb", "great production quality"]
sections = [
    (0, m["morning"], "[Opening] {starts immediately: a soft, serious piano motif over a quiet string pad, continuous}",
     BASE + ["starts immediately", "serious", "slow tempo 72 bpm", "continuous", "steady level"]),
    (m["morning"], m["complaint"], "[Day] {a gentle, busy piano pattern, warm and hopeful, everyday life}",
     BASE + ["gentle ostinato", "warm", "hopeful", "major key", "slow tempo 72 bpm", "continuous"]),
    *([(m["complaint"], m["pile"], "[Weight] {the same pattern slowly turns heavier and more tired}",
        ["piano", "soft strings", "minor key", "melancholic", "tired", "slowly sinking", "continuous"]),
       (m["pile"], m["floor"], "[Pile-up] {restless repeated piano figure, pressure building, crowded, no drums}",
        ["restless", "tense", "repeated piano figure", "pressure building", "strings tremolo", "minor key", "continuous"])]
      if "pile" in m else
      [(m["complaint"], m["floor"], "[Weight] {the same pattern slowly turns heavier and more tired}",
        ["piano", "soft strings", "minor key", "melancholic", "tired", "slowly sinking", "continuous"])]),
    (m["floor"], m["backToStart"], "[Breakdown] {sparse lonely piano notes, lots of space, very quiet}",
     ["very sparse", "lonely", "single piano notes", "quiet", "minor key", "dark"]),
    (m["backToStart"], m["never"], "[Turning] {warm low strings rise under the piano, hope returns}",
     ["tender", "warm low strings", "piano", "hope", "major key", "building slowly", "emotional"]),
    (m["never"], tl["outro"], "[Resolution] {uplifting, full and warm, emotional release}",
     ["uplifting", "full strings", "piano", "major key", "emotional release", "cinematic swell"]),
    (tl["outro"], total, "[Outro] {calm final chord, fade out}", ["calm", "warm", "resolving", "final chord", "fade out"]),
]
chunks = []
for a, b, text, styles in sections:
    ms = int(round((b - a) * 1000))
    if ms < 3000:
        chunks[-1]["duration_ms"] += ms
        continue
    chunks.append({"text": text, "duration_ms": ms, "positive_styles": styles, "negative_styles": NO})
print("sections:", [(c["text"].split("]")[0] + "]", round(c["duration_ms"] / 1000, 1)) for c in chunks])
bounds = [0.0]
for c in chunks:
    bounds.append(bounds[-1] + c["duration_ms"] / 1000)


def levels(path, step=0.25):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, np.int16).astype(float) / 32768
    n = int(step * 8000)
    return [20 * np.log10(np.sqrt(np.mean(a[i:i + n] ** 2)) + 1e-9) for i in range(0, len(a) - n, n)]


def check(path):
    """Late start, dropouts (>= 1 s silent outside the planned quiet breakdown) and sudden swells
    (a second >10 dB louder than the one before, away from a section boundary)."""
    lv = levels(path)
    step = 0.25
    lead = next((i * step for i, v in enumerate(lv) if v > -40), 99.0)
    quiet = (m["floor"], m["backToStart"] + 2)
    drops, run = [], 0
    for i, v in enumerate(lv):
        t = i * step
        run = run + 1 if v < -45 and t > lead and not (quiet[0] <= t <= quiet[1]) and t < tl["outro"] else 0
        if run * step == 1.0:
            drops.append(round(t - 0.75, 2))
    swells = []
    for i in range(int(3 / step), len(lv) - 4):
        t = i * step
        now = np.mean(lv[i:i + 4])
        before = np.mean(lv[max(0, i - 5):i - 1])
        if now - before > 10 and all(abs(t - b) > 1.2 for b in bounds) and (not swells or t - swells[-1] > 1):
            swells.append(round(t, 2))
    return lead, drops, swells


seed = int(sys.argv[1]) if len(sys.argv) > 1 else 101
used0, limit, _ = credits()
raw = MUSIC / f"score-{VARIANT}-raw-seed{seed}.mp3"
if raw.exists() and raw.stat().st_mtime > TIMELINE.stat().st_mtime:
    print(f"seed {seed}: reusing the take already composed for this timeline")
else:
    body = {"composition_plan": {"chunks": chunks}, "model_id": "music_v2_5", "seed": seed}
    raw.write_bytes(call("POST", "/v1/music", body, query="output_format=mp3_48000_192", raw=True, timeout=900))
lead, drops, swells = check(raw)
if 0.4 < lead <= 3 and not drops and not swells:
    # zero-credit fix for a slow start: cut the silent lead (the music then leads the story by that
    # much, which is unnoticeable) and pad the end so the length still matches the video
    trimmed = raw.with_name(raw.stem + "-trim.mp3")
    cut = max(0.0, lead - 0.15)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{cut:.2f}", "-i", str(raw), "-af", f"apad=pad_dur={cut:.2f}",
                    "-c:a", "libmp3lame", "-b:a", "192k", str(trimmed)], check=True)
    print(f"seed {seed}: trimmed {cut:.2f}s of silent lead")
    raw = trimmed
    lead, drops, swells = check(raw)
ok = lead <= 0.4 and not drops and not swells
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(raw)]))
print(f"seed {seed}: {dur:.1f}s (timeline {total}s), starts at {lead:.2f}s, dropouts {drops or 'none'}, swells {swells or 'none'} -> {'OK' if ok else 'FAILED'}")
if ok:
    level(raw, SCORE, -20, MUSIC_EQ, ("-c:a", "aac", "-b:a", "192k"))
    print(f"-> {SCORE.relative_to(ROOT)}")
used1, _, _ = credits()
print(f"credits used: {used1 - used0}  (now {used1}/{limit})")
sys.exit(0 if ok else 1)
