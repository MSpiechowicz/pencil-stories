"""Generate the turning-point passage with each candidate voice (from My Voices) in two models.

Usage: tools/tts/.venv-cb/bin/python tools/eleven/voice_samples.py [name ...]
       default names: Rick Dan David
Writes tools/tts/samples/el_<voice>_<model>.mp3 and prints credits used.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import ROOT, credits, find_voice, my_voices, tts  # noqa: E402

TEXT = ("One night, alone in the dark, he felt he had nothing left. "
        "Then he remembered who he was fighting for. His wife. His little girl.")
MODELS = ["eleven_v3", "eleven_multilingual_v2"]
names = sys.argv[1:] or ["Rick", "Dan", "David"]

used0, limit, tier = credits()
print(f"plan: {tier}, credits used {used0}/{limit}")
print("My Voices:", ", ".join(sorted(my_voices())))
out = ROOT / "tools/tts/samples"
out.mkdir(parents=True, exist_ok=True)
for n in names:
    full, vid = find_voice(n)
    for m in MODELS:
        audio = tts(TEXT, vid, m)
        f = out / f"el_{re.sub(r'[^a-z0-9]+', '_', full.lower()).strip('_')}_{m}.mp3"
        f.write_bytes(audio)
        print("wrote", f.relative_to(ROOT))
used1, _, _ = credits()
print(f"credits used by samples: {used1 - used0}  (now {used1}/{limit})")
