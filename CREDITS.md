# Credits — "Laid Off: 20 Years"

Music: original score generated with Eleven Music (ElevenLabs, paid Starter plan — commercial
use incl. monetized YouTube/Instagram allowed; not for distribution on Spotify/Apple Music).
No attribution required in the description.

Narration: ElevenLabs voice "Brian - Deep, Resonant and Comforting", model eleven_v3.
Every line is checked with Whisper speech recognition and retaken if a word is wrong.

Re-generate (needs ELEVENLABS_API_KEY in .env, never commit it):

    tools/tts/.venv-cb/bin/python tools/eleven/narrate.py Brian eleven_v3      # narration
    npx tsx scripts/export-timeline.ts                                          # section timings
    tools/tts/.venv-cb/bin/python tools/eleven/music.py                         # score fitted to them
    npm run render                                                              # out/layoff/laid-off-20-years.mp4 (short: npm run render:short -> out/layoff/laid-off-short.mp4)

Story files: src/stories/layoff (script, narration text, timings), public/layoff (voice, score),
out/layoff (renders). Older material: Kevin MacLeod tracks in public/music (CC BY 4.0, credit
required only if used again) and the Chatterbox narration in out/layoff/voice-chatterbox/.
