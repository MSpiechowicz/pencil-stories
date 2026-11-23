"""Narration with an ElevenLabs voice, verified by Whisper (retakes until the words match).

Usage: tools/tts/.venv-cb/bin/python tools/eleven/narrate.py "<voice name>" [model] [id ...]
Writes public/<story>/voice/<id>.wav (same loudness chain as before) and src/stories/<story>/narration.timing.json.
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parents[1] / "tts"))
from common import ROOT, credits, find_voice, tts  # noqa: E402
from cb_voice import words  # noqa: E402  (same text normalisation as the Chatterbox QA)
from faster_whisper import WhisperModel  # noqa: E402
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from story_paths import NARRATION, TIMING, VOICE  # noqa: E402
from audio import VOICE_EQ, level, soften_edges  # noqa: E402

voice_name = sys.argv[1] if len(sys.argv) > 1 else "Rick"
model = sys.argv[2] if len(sys.argv) > 2 else "eleven_multilingual_v2"
only = set(sys.argv[3:])
full, vid = find_voice(voice_name)
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
lines = json.loads(NARRATION.read_text())
timing_path = TIMING
VOICE.mkdir(parents=True, exist_ok=True)
timing = json.loads(timing_path.read_text()) if timing_path.exists() else {"durations": {}}
timing.update({"voice": f"elevenlabs:{full}:{model}", "speed": 1.0})
used0, limit, _ = credits()

for line in lines:
    if only and line["id"] not in only:
        continue
    out = VOICE / f"{line['id']}.wav"
    mp3 = out.with_suffix(".mp3")
    got = ""
    for attempt in range(3):
        mp3.write_bytes(tts(line["text"], vid, model))
        segs, _ = asr.transcribe(str(mp3), beam_size=5, temperature=0.0, condition_on_previous_text=False)
        got = " ".join(s.text.strip() for s in segs)
        if words(got) == words(line["text"]):
            break
    ok = words(got) == words(line["text"])
    level(mp3, out, -16, VOICE_EQ)
    soften_edges(out)
    mp3.unlink()
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)]))
    timing["durations"][line["id"]] = round(dur, 3)
    timing_path.write_text(json.dumps(timing, indent=2))
    print(f"{'OK ' if ok else 'BAD'} {line['id']} {dur:4.1f}s  heard: {got}", flush=True)

used1, _, _ = credits()
print(f"credits used: {used1 - used0}  (now {used1}/{limit})")
