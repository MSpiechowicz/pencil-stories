// The book films for "The Missing Piece": the schedule built from the story's steps.
// MISSING_PIECE: silent (timed by the steps' own holds).
// MISSING_PIECE_KOKORO: with a local Kokoro test narration (tools/tts/narrate.py, voice af_heart);
//   each line starts at the drawn item carrying its mark, and the pencil waits there for the
//   narrator. The final narration will replace it the same way.
import {schedule} from '../../book/timeline';
import type {BookFilm, PaperStyle} from '../../book/Book';
import {SHORT_SPREADS, SHORT_STEPS, SPREADS, STEPS} from './story';
import kokoroTiming from './narration-kokoro.timing.json';
import kokoroLines from './narration-kokoro.json';
import shortsLines from './narration-shorts.json';
import shortsTiming from './narration-shorts.timing.json';
import youtubeLines from './narration-youtube.json';
import youtubeTiming from './narration-youtube.timing.json';

const OUTRO = 210;
// clean sketchbook paper: no rules, no margin (chosen over the notebook look for this story)
const PAPER: PaperStyle = 'plain';
const FPS = 30;

const S = schedule(STEPS);
export const MISSING_PIECE: BookFilm = {S, spreads: SPREADS, outro: OUTRO, total: S.end + OUTRO, paper: PAPER};

const voiceFrames = (durations: Record<string, number>) =>
  Object.fromEntries(Object.entries(durations).map(([id, sec]) => [id, Math.ceil(sec * FPS)]));
const SK = schedule(STEPS, kokoroLines, voiceFrames(kokoroTiming.durations));
export const MISSING_PIECE_KOKORO: BookFilm = {
  S: SK, spreads: SPREADS, outro: OUTRO, total: SK.end + OUTRO, paper: PAPER,
  voice: {dir: 'missing-piece/voice-kokoro', outroLine: 'outro'},
};

/** The Shorts / Reels cut (vertical), with the same Kokoro test narration. */
const SS = schedule(SHORT_STEPS, kokoroLines, voiceFrames(kokoroTiming.durations));
export const MISSING_PIECE_SHORT_KOKORO: BookFilm = {
  S: SS, spreads: SHORT_SPREADS, outro: 150, total: SS.end + 150, paper: PAPER,
  voice: {dir: 'missing-piece/voice-kokoro', outroLine: 'outro'},
};

/** The Shorts / Reels cut narrated by ElevenLabs "Laura - a top narration voice" (eleven_v3),
 *  with its own score (tools/eleven/music_book.py) ducked under the voice. */
const LAURA = voiceFrames(shortsTiming.durations);
const SL = schedule(SHORT_STEPS, shortsLines, LAURA);
export const MISSING_PIECE_SHORT: BookFilm = {
  S: SL, spreads: SHORT_SPREADS, outro: 150, total: SL.end + 150, paper: PAPER,
  voice: {dir: 'missing-piece/voice-shorts', outroLine: 'outro', frames: LAURA},
  music: 'missing-piece/music/score-shorts.m4a',
};

/** The full 16:9 YouTube film narrated by Laura (the Shorts takes reused where the line is the
 *  same), with its own score at one steady level. */
const LAURA_FULL = voiceFrames(youtubeTiming.durations);
const SY = schedule(STEPS, youtubeLines, LAURA_FULL);
export const MISSING_PIECE_YOUTUBE: BookFilm = {
  S: SY, spreads: SPREADS, outro: OUTRO, total: SY.end + OUTRO, paper: PAPER,
  voice: {dir: 'missing-piece/voice-youtube', outroLine: 'outro', frames: LAURA_FULL},
  music: 'missing-piece/music/score-youtube.m4a',
};
