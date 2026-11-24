"""Per-story file locations. Pick the story with STORY=<name> (default: layoff) and the cut with
VARIANT=long|short|wide (default: long). "wide" is the 16:9 2K full video: the long story with its
own narration (narration-wide.json, a different narrator), voice-wide/, timing and fitted score."""
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
STORY = os.environ.get("STORY", "layoff")
VARIANT = os.environ.get("VARIANT", "long")
_sfx = "" if VARIANT == "long" else f"-{VARIANT}"
SRC = ROOT / "src/stories" / STORY                     # story.ts / short.ts, narration*.json
NARRATION = SRC / f"narration{_sfx}.json"
TIMING = SRC / f"narration{_sfx}.timing.json"
VOICE = ROOT / "public" / STORY / f"voice{_sfx}"       # generated narration (<id>.wav)
MUSIC = ROOT / "public" / STORY / "music"              # generated scores (score{_sfx}.m4a)
SCORE = MUSIC / f"score{_sfx}.m4a"
OUT = ROOT / "out" / STORY                             # renders, timeline{_sfx}.json, previews
TIMELINE = OUT / f"timeline{_sfx}.json"
