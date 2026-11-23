"""Regenerate narration lines until Whisper hears exactly the script (Chatterbox can garble).

Usage: tools/tts/.venv-cb/bin/python tools/tts/qa_lines.py [id ...]   (no ids = check all, fix bad ones)
"""
import json
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cb_voice import ROOT, render  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from story_paths import NARRATION, TIMING, VOICE  # noqa: E402

VOICE = dict(ref="am_michael_slow", cfg=0.25, exaggeration=0.7, pause=0.5)
NUM = {"1": "one", "5": "five", "20": "twenty", "ai": "ai"}
asr = WhisperModel("small.en", device="cpu", compute_type="int8")


def words(s):
    s = re.sub(r"\[[^\]]*\]", " ", s)  # v3 delivery tags are performed, not spoken
    s = s.lower().replace("a.i.", "ai").replace("e-mail", "email").replace("'", "").replace("’", "")
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split()]


def heard(path):
    segs, _ = asr.transcribe(str(path), beam_size=5)
    return " ".join(x.text.strip() for x in segs)


def ok(text, got):
    return words(text) == words(got)


lines = json.loads(NARRATION.read_text())
want = set(sys.argv[1:])
timing_path = TIMING
timing = json.loads(timing_path.read_text())
for line in lines:
    if want and line["id"] not in want:
        continue
    path = VOICE / f"{line['id']}.wav"
    got = heard(path) if path.exists() else ""
    seed = 7
    while not ok(line["text"], got) and seed < 7 + 6 * 11:
        seed += 11
        render(line["text"], path, seed=seed, **VOICE)
        got = heard(path)
    status = "OK " if ok(line["text"], got) else "BAD"
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))
    timing["durations"][line["id"]] = round(dur, 3)
    timing_path.write_text(json.dumps(timing, indent=2))
    print(f"{status} {line['id']} seed={seed} {dur:4.1f}s  heard: {got}", flush=True)
