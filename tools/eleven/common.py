"""ElevenLabs helpers. The API key is read from .env (ELEVENLABS_API_KEY) or the environment
and is never printed or logged."""
import json
import os
import pathlib
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
API = "https://api.elevenlabs.io"


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    env = ROOT / ".env"
    if not k and env.exists():
        for line in env.read_text().splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not k:
        raise SystemExit("No ELEVENLABS_API_KEY found. Put it in .env in the project root.")
    return k


def call(method, path, body=None, query="", raw=False, timeout=600):
    req = urllib.request.Request(
        f"{API}{path}{('?' + query) if query else ''}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"xi-api-key": key(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return data if raw else json.loads(data)
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:500]
        raise SystemExit(f"ElevenLabs {method} {path} failed: HTTP {e.code}: {msg}")


def credits():
    s = call("GET", "/v1/user/subscription")
    return s.get("character_count", 0), s.get("character_limit", 0), s.get("tier", "?")


def my_voices():
    return {v["name"]: v["voice_id"] for v in call("GET", "/v1/voices")["voices"]}


def find_voice(name):
    voices = my_voices()
    hits = [n for n in voices if name.lower() in n.lower()]
    if not hits:
        raise SystemExit(f"Voice '{name}' is not in My Voices. Add it from the Voice Library first. Have: {sorted(voices)}")
    return hits[0], voices[hits[0]]


def tts(text, voice_id, model="eleven_multilingual_v2", settings=None):
    body = {"text": text, "model_id": model}
    if settings:
        body["voice_settings"] = settings
    return call("POST", f"/v1/text-to-speech/{voice_id}", body, query="output_format=mp3_44100_128", raw=True)
