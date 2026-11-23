"""Build the short version's score by re-cutting the long score: each story section of the
short cut takes the matching section of the long score (from its start or its end), joined
with short cross-fades. Free — no new music generation.

Usage: VARIANT=long npx tsx scripts/export-timeline.ts && VARIANT=short npx tsx scripts/export-timeline.ts
       tools/tts/.venv-cb/bin/python tools/recut_score.py
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audio import MUSIC_EQ, level  # noqa: E402
from story_paths import MUSIC, OUT, ROOT  # noqa: E402

SRC = MUSIC / "score-fit.wav"          # long score before EQ, aligned to the long timeline (minus the hook)
long_tl = json.loads((OUT / "timeline.json").read_text())
short_tl = json.loads((OUT / "timeline-short.json").read_text())
XF = 0.5                                # default cross-fade (s)
# longer, musical transitions where the story itself turns (instead of an audible jump)
XFS = {"family": 2.5, "climax": 1.5}     # keyed by the section the fade leaves


def sections(tl, family_key):
    m, h = tl["marks"], tl["marks"]["start"] - 0.2  # music time 0 == drawing start
    cut = [("intro", m["start"], m["email"], "start"), ("sinking", m["email"], m["night"], "end"),
           ("lowest", m["night"], m["voice"], "start"), ("pause", m["voice"], m[family_key], "start"),
           ("family", m[family_key], m["study"], "start"), ("build", m["study"], m["yes"], "end"),
           ("climax", m["yes"], tl["outro"], "start"), ("outro", tl["outro"], tl["total"], "end")]
    return {n: (a - h, b - h, how) for n, a, b, how in cut}


src_sec = sections(long_tl, "familyb")   # in the long film the music swells at the second family line
dst_sec = sections(short_tl, "family")
order = ["intro", "sinking", "lowest", "pause", "family", "build", "climax", "outro"]
parts = []
for i, name in enumerate(order):
    s0, s1, how = src_sec[name]
    d0, d1, _ = dst_sec[name]
    need = (d1 - d0) + (XFS.get(name, XF) if i < len(order) - 1 else 0)
    if need > s1 - s0:
        print(f"  {name}: source {s1 - s0:.1f}s shorter than needed {need:.1f}s, taking all of it")
        need = s1 - s0
    a = s0 if how == "start" else s1 - need
    parts.append((name, max(0.0, a), need))
    print(f"  {name:8s} short {d1 - d0:5.1f}s  <- long {a:6.1f}..{a + need:6.1f}s ({how})")

inputs, fc = [], []
for k, (name, a, n) in enumerate(parts):
    inputs += ["-ss", f"{a:.3f}", "-t", f"{n:.3f}", "-i", str(SRC)]
chain = "[0:a]"
for k in range(1, len(parts)):
    out = f"[x{k}]"
    fc.append(f"{chain}[{k}:a]acrossfade=d={XFS.get(parts[k - 1][0], XF)}:c1=tri:c2=tri{out}")
    chain = out
dst = MUSIC / "score-short-raw.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", chain, "-ar", "48000", str(dst)], check=True)
level(dst, MUSIC / "score-short.m4a", -20, MUSIC_EQ, ("-c:a", "aac", "-b:a", "192k"))
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(MUSIC / "score-short.m4a")]))
want = short_tl["total"] - (short_tl["marks"]["start"] - 0.2)
print(f"wrote {(MUSIC / 'score-short.m4a').relative_to(ROOT)}: {dur:.2f}s (music part of the short film: {want:.2f}s)")

# check the joins for jumps (level change across each cross-fade)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(dst), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.int16).astype(float) / 32768
db = lambda t0, t1: 20 * np.log10(np.sqrt(np.mean(x[int(t0 * 8000):int(t1 * 8000)] ** 2)) + 1e-9)
t = 0.0
for k, (name, a, n) in enumerate(parts[:-1]):
    t += n - XFS.get(name, XF)
    xf = XFS.get(name, XF)
    print(f"  join {name:>8s} -> {parts[k + 1][0]:<8s} at {t:5.1f}s ({xf}s fade): {db(t - 1.0, t - 0.25):6.1f} -> {db(t + xf / 2 - 0.4, t + xf / 2 + 0.4):6.1f} (mid) -> {db(t + xf + 0.25, t + xf + 1.0):6.1f} dB")
