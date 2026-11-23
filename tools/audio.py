"""Clean, static audio processing: EQ + a single fixed gain to hit a loudness target
(two-pass linear loudnorm). No compressors or dynamic normalisation, so nothing pumps."""
import json
import subprocess


def _measure(src, pre, target):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af",
                          f"{pre + ',' if pre else ''}loudnorm=I={target}:TP=-1.5:LRA=20:print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    return json.loads(out[out.rindex("{"):out.rindex("}") + 1])


def level(src, dst, target=-16.0, pre="", extra_out=()):
    """Apply `pre` filters, then one linear gain so the file lands on `target` LUFS."""
    m = _measure(src, pre, target)
    ln = (f"loudnorm=I={target}:TP=-1.5:LRA=20:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
          f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"{pre + ',' if pre else ''}{ln}",
                    "-ar", "48000", *extra_out, str(dst)], check=True)


# ElevenLabs trims its audio tightly (often mid-decay), which clicks at every line change.
# Fade both ends briefly and leave a little air around each line.
EDGES = "afade=t=in:d=0.015,areverse,afade=t=in:d=0.06,areverse,adelay=100:all=1,apad=pad_dur=0.3"


def soften_edges(path):
    """Apply EDGES to a narration file in place."""
    tmp = str(path) + ".tmp.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af", EDGES, "-ar", "48000", tmp], check=True)
    import os
    os.replace(tmp, path)


# Brian is a very dark voice: trim rumble and low-mid mud, lift presence and air.
VOICE_EQ = ("highpass=f=75,equalizer=f=280:t=q:w=1.0:g=-2.5,equalizer=f=3200:t=q:w=1.2:g=3.5,"
            "highshelf=f=7500:g=3")
# Music: leave a gentle pocket where speech lives.
MUSIC_EQ = "equalizer=f=1800:t=q:w=1.0:g=-3"
