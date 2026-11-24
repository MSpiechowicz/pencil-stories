# pencil-stories

Hand-drawn motivational stories for the **PencilStories** channel (YouTube, YouTube Shorts,
Instagram Reels). One pencil draws a story down a notebook page; a narrator (ElevenLabs) and an
original score (Eleven Music) follow the drawing. Built with Remotion.

## What a story produces

| File (`out/<story>/`) | For | Size |
|---|---|---|
| `<story>-youtube.mp4` | YouTube | 2560×1440 (16:9 2K) |
| `<story>-youtube-shorts.mp4` | YouTube Shorts | 1440×2560 |
| `<story>-instagram-reels.mp4` | Instagram Reels | 1080×1920 |
| `cover-9x16.png`, `thumbnail-16x9.png` | covers | |

## Making the next story

1. **Copy the story folder**: `src/stories/layoff` → `src/stories/<story>`, point
   `src/stories/current.ts` at it, and rename the output files in the `render:*` scripts of
   `package.json` (`out/layoff/layoff-…` → `out/<story>/<story>-…`). In the story folder:
   - `story.ts` (long cut) and `short.ts` (short cut): the drawings (`DrawItem`s); each section
     starts at an item with a `mark`.
   - `narration-wide.json` (YouTube) and `narration-reel.json` (short): one line per mark, with
     v3 emotion tags (`[somber]`, `[hopeful]`, `[determined]`…) and `gap` = seconds of silence
     before the line (≈1 s, ≈2 s where the mood turns). The hook line has mark `hook`.
   - `publish.json`: titles, descriptions, captions, file names.
2. **Record the narration** (Whisper checks every line; only lines whose words come out wrong are retaken):
   `VARIANT=wide tools/tts/.venv-cb/bin/python tools/eleven/narrate.py "David - Deep, Cinematic" eleven_v3`
   (same with `VARIANT=reel`; pass line ids to record only some). Lines identical to another cut
   can be copied instead of recorded.
3. **Compose the score**, one take per run (≈1,500 credits each), and check it before trying another seed:
   `VARIANT=wide npx tsx scripts/export-timeline.ts && VARIANT=wide tools/tts/.venv-cb/bin/python tools/eleven/music.py`
   The script reports a late start, dropouts, a fading opening and sudden swells. A late start can
   be trimmed instead of re-composed.
4. **Check and render**: `npx remotion studio` to preview, `npx tsx scripts/check-camera.ts`,
   then `npm run render` (all three files) or `render:youtube` / `render:shorts`; `npm run covers`.
5. **Publish**: `npm run publish -- <story>` shows exactly what would be posted (dry run);
   add `--go` to post. Options: `--youtube --shorts --instagram`, `--privacy unlisted|public`,
   `--publish-at 2026-12-01T18:00:00Z` (YouTube only). Posted links are logged in
   `out/<story>/published.json`, so nothing is posted twice.

## Credentials (never committed)

- `.env`: `ELEVENLABS_API_KEY`, `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- `secrets/youtube_client_secret.json` (Google OAuth, Desktop app); `secrets/youtube_token.json`
  is created on the first sign-in.
- Python environments: `tools/tts/.venv-cb` (narration, music), `tools/publish/.venv`
  (`npm run publish:setup` to recreate).

## Brand

`brand/`: channel avatar, banner, wordmark, watermark (`npm run brand` re-renders them).
