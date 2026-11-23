"""Final master: one fixed gain to -14 LUFS (two-pass linear loudnorm), video stream copied.
Usage: python3 scripts/master.py <in.mp4> <out.mp4> [--remove-input]"""
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "tools"))
from audio import level  # noqa: E402

src, dst = sys.argv[1], sys.argv[2]
remove_input = "--remove-input" in sys.argv[3:]
tmp = pathlib.Path(dst).with_suffix(".audio.m4a")
level(src, tmp, -14, "", ("-vn", "-c:a", "aac", "-b:a", "192k"))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", str(tmp), "-map", "0:v", "-map", "1:a", "-c", "copy", dst], check=True)
tmp.unlink()
if remove_input:
    pathlib.Path(src).unlink()  # the raw render was only an intermediate
