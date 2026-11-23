"""Expressive narration samples with Chatterbox (MIT). Reference voices are synthetic (Kokoro)."""
import pathlib
import torchaudio
from chatterbox.tts import ChatterboxTTS

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/tts/samples"
TEXT = ("One night, alone in the dark, he felt he had nothing left. "
        "Then he remembered who he was fighting for.")
model = ChatterboxTTS.from_pretrained(device="cpu")
runs = [("cb_default", None), ("cb_george", "bm_george"), ("cb_michael", "am_michael"), ("cb_onyx", "am_onyx")]
for name, ref in runs:
    prompt = str(ROOT / f"tools/tts/refs/{ref}.wav") if ref else None
    wav = model.generate(TEXT, audio_prompt_path=prompt, exaggeration=0.65, cfg_weight=0.35)
    torchaudio.save(str(OUT / f"{name}.wav"), wav, model.sr)
    print("wrote", name, flush=True)
