"""Generate the narration with Kokoro (local, Apache-2.0 model).

Usage:  tools/tts/.venv/bin/python tools/tts/narrate.py [voice] [speed]
        voice defaults to am_michael, speed to 0.92
Writes public/<story>/voice/<id>.wav and src/stories/<story>/narration.timing.json (durations).
The drawing waits for each line to finish, so timing never overlaps.
"""
import json
import pathlib
import subprocess
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from story_paths import NARRATION, TIMING, VOICE  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODELS = ROOT / "tools/tts/models"
voice = sys.argv[1] if len(sys.argv) > 1 else "am_michael"
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.92

lines = json.loads(NARRATION.read_text())
out = VOICE
out.mkdir(parents=True, exist_ok=True)
kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))

timing = {}
for line in lines:
    samples, sr = kokoro.create(line["text"], voice=voice, speed=line.get("speed", speed),
                                lang="en-gb" if voice.startswith("b") else "en-us")
    raw = out / f"{line['id']}.raw.wav"
    sf.write(raw, samples, sr)
    # clean + level the voice: rumble filter, gentle compression, -16 LUFS
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
                    "-ar", "48000", str(out / f"{line['id']}.wav")], check=True)
    raw.unlink()
    timing[line["id"]] = round(len(samples) / sr, 3)
    print(f"{line['id']}  {timing[line['id']]:4.1f}s  {line['text']}")

TIMING.write_text(json.dumps({"voice": voice, "speed": speed, "durations": timing}, indent=2))
