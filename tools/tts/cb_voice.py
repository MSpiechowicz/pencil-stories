"""Chatterbox narration (MIT). One sentence at a time with natural pauses, then a gentle slow-down.

Library use:  render(text, out_path, ref, exaggeration, cfg, pause, tempo)
"""
import pathlib
import re
import subprocess

import torch
import torchaudio
from chatterbox.tts import ChatterboxTTS

ROOT = pathlib.Path(__file__).resolve().parents[2]
_model = None


def model():
    global _model
    if _model is None:
        _model = ChatterboxTTS.from_pretrained(device="cpu")
    return _model


_asr = None
NUM = {"1": "one", "5": "five", "20": "twenty"}


def words(s):
    s = re.sub(r"\[[^\]]*\]", " ", s)  # v3 delivery tags are performed, not spoken
    s = s.lower().replace("a.i.", "ai").replace("e-mail", "email").replace("'", "").replace("’", "")
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s).split()]


def hear(wav, sr):
    """Transcribe one sentence; repetitions are kept (no previous-text conditioning)."""
    global _asr
    if _asr is None:
        from faster_whisper import WhisperModel
        _asr = WhisperModel("small.en", device="cpu", compute_type="int8")
    mono = torchaudio.functional.resample(wav, sr, 16000)[0].numpy()
    segs, _ = _asr.transcribe(mono, beam_size=5, temperature=0.0, condition_on_previous_text=False,
                              word_timestamps=True, vad_filter=False)
    return " ".join(s.text.strip() for s in segs)


def trim_and_gaps(wav, sr):
    """Trim silence at both ends; return (trimmed, longest internal silence in s, speech islands)."""
    hop = int(sr * 0.02)
    x = wav[0]
    rms = torch.stack([x[i:i + hop].pow(2).mean().sqrt() for i in range(0, len(x) - hop, hop)])
    loud = rms > rms.max() * 0.04
    idx = torch.nonzero(loud).flatten()
    if len(idx) == 0:
        return wav, 0.0, 0
    a, b = int(idx[0]), int(idx[-1])
    longest, run, islands, prev = 0, 0, 1, True
    for v in loud[a:b + 1].tolist():
        if v:
            if not prev and run * 0.02 > 0.32:
                islands += 1
            run = 0
        else:
            run += 1
            longest = max(longest, run)
        prev = v
    pad = int(sr * 0.06)
    return wav[:, max(0, a * hop - pad):min(len(x), (b + 1) * hop + pad)], longest * 0.02, islands


def sentence(m, text, prompt, exaggeration, cfg, seed, tries=8):
    """Generate one sentence until Whisper hears exactly it and there is no stray word after a pause."""
    best = None
    for k in range(tries):
        torch.manual_seed(seed + 101 * k)
        wav = m.generate(text, audio_prompt_path=prompt, exaggeration=exaggeration, cfg_weight=cfg)
        wav, gap, islands = trim_and_gaps(wav, m.sr)
        got = hear(wav, m.sr)
        commas = text.count(",")
        ok = words(got) == words(text) and gap < 0.75 and islands <= commas + 1
        score = (words(got) == words(text), -abs(len(words(got)) - len(words(text))), -gap)
        if best is None or score > best[0]:
            best = (score, wav, got)
        if ok:
            return wav, got, True
    return best[1], best[2], False


def render(text, out, ref="am_michael_slow", exaggeration=0.6, cfg=0.3, pause=0.38, tempo=1.0, seed=7):
    m = model()
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text) if p.strip()]
    gap = torch.zeros(1, int(m.sr * pause))
    chunks = []
    prompt = str(ROOT / f"tools/tts/refs/{ref}.wav")
    for p in parts:
        wav, got, ok = sentence(m, p, prompt, exaggeration, cfg, seed)
        print(f"   {'ok ' if ok else 'BAD'} [{p}] -> [{got}]", flush=True)
        chunks += [wav, gap]
    raw = pathlib.Path(str(out) + ".raw.wav")
    torchaudio.save(str(raw), torch.cat(chunks[:-1], dim=1), m.sr)
    af = f"atempo={tempo}," if tempo != 1.0 else ""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    af + "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
                    "-ar", "48000", str(out)], check=True)
    raw.unlink()


if __name__ == "__main__":
    OUT = ROOT / "tools/tts/samples"
    TEXT = "One night, alone in the dark, he felt he had nothing left. Then he remembered who he was fighting for."
    render(TEXT, OUT / "cb_michael_slow_A.wav", cfg=0.3)
    print("A", flush=True)
    render(TEXT, OUT / "cb_michael_slow_B.wav", cfg=0.25, exaggeration=0.7, pause=0.5)
    print("B", flush=True)
    render(TEXT, OUT / "cb_michael_slow_C.wav", cfg=0.3, tempo=0.9)
    print("C", flush=True)
