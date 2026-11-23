"""Generate the whole narration with Chatterbox, voice "Michael B" (expressive, slower).

Usage: tools/tts/.venv-cb/bin/python tools/tts/narrate_cb.py [only_id ...]
Writes public/<story>/voice/<id>.wav and src/stories/<story>/narration.timing.json.
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cb_voice import ROOT, render  # noqa: E402
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from story_paths import NARRATION, TIMING, VOICE  # noqa: E402

VOICE = dict(ref="am_michael_slow", cfg=0.25, exaggeration=0.7, pause=0.5)
lines = json.loads(NARRATION.read_text())
only = set(sys.argv[1:])
out = VOICE
out.mkdir(parents=True, exist_ok=True)
timing_path = TIMING
timing = json.loads(timing_path.read_text()) if timing_path.exists() else {"durations": {}}
timing.update({"voice": "chatterbox:michael-B", "speed": 1.0})
for line in lines:
    if only and line["id"] not in only:
        continue
    path = out / f"{line['id']}.wav"
    render(line["text"], path, **VOICE)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))
    timing["durations"][line["id"]] = round(dur, 3)
    timing_path.write_text(json.dumps(timing, indent=2))
    print(f"{line['id']} {dur:4.1f}s {line['text']}", flush=True)
