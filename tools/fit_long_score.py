"""Fit the long version's existing score to the current timeline, without regenerating it:
 - a soft lead-in (the score's opening piano) plays under the hook and cross-fades into the score
   exactly where the story starts;
 - each section between story beats is time-stretched by a few percent so every music cue lands on
   its beat again.
Usage: npx tsx scripts/export-timeline.ts && tools/tts/.venv-cb/bin/python tools/fit_long_score.py
       (VARIANT=wide for the 16:9 version with its own narrator)
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audio import MUSIC_EQ, level  # noqa: E402
from story_paths import MUSIC, ROOT, SCORE, TIMELINE  # noqa: E402

SRC = MUSIC / "score-fit.wav"  # the score as composed/stretched for the old timeline
# beat times the score was composed for (old timeline, before the hook existed)
OLD = {"start": 0.2, "email": 16.5, "night": 46.6, "voice": 56.2, "familyb": 61.0, "study": 69.2,
       "yes": 98.7, "end": 105.6, "end2": 108.03, "outro": 121.57, "total": 129.90}
tl = json.loads(TIMELINE.read_text())
NEW = {**{k: tl["marks"][k] for k in OLD if k in tl["marks"]}, "outro": tl["outro"], "total": tl["total"]}
keys = ["start", "email", "night", "voice", "familyb", "study", "yes", "end", "end2", "outro", "total"]
src_len = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(SRC)]))

inputs, chains = [], []
# warped body: old [0, start] unchanged, then each beat-to-beat section stretched to its new length
bounds_old = [0.0] + [OLD[k] for k in keys]
bounds_new = [0.0] + [NEW[k] - (NEW["start"] - OLD["start"]) for k in keys]  # relative to the story start
bounds_old[-1] = min(bounds_old[-1], src_len)
for i in range(len(bounds_old) - 1):
    a, b = bounds_old[i], bounds_old[i + 1]
    want = bounds_new[i + 1] - bounds_new[i]
    tempo = (b - a) / want
    inputs += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(SRC)]
    chains.append(f"[{i}:a]atempo={tempo:.5f}[s{i}]")
    print(f"  {keys[i - 1] if i else 'begin':8s}-> {keys[i]:8s} {b - a:6.2f}s -> {want:6.2f}s  (x{want / (b - a):.3f})")
n = len(bounds_old) - 1
body = "".join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[body]"
# lead-in under the hook: the opening piano, cross-faded into the body at the story start
lead = NEW["start"] - OLD["start"]
XF = 1.0
inputs += ["-ss", "0", "-t", f"{lead + XF:.3f}", "-i", str(SRC)]
fc = ";".join(chains + [body, f"[{n}:a]afade=t=in:d=0.8[lead]", f"[lead][body]acrossfade=d={XF}:c1=tri:c2=tri[out]"])
dst = MUSIC / f"{SCORE.stem}-fit-out.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[out]", "-ar", "48000", str(dst)], check=True)
level(dst, SCORE, -20, MUSIC_EQ, ("-c:a", "aac", "-b:a", "192k"))
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(SCORE)]))
print(f"lead-in {lead:.2f}s; wrote {SCORE.relative_to(ROOT)}: {dur:.2f}s (film {NEW['total']:.2f}s)")
