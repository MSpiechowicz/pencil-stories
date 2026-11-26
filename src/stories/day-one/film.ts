// The book film for "Day One. Again.": the schedule built from the story's steps.
// DAY_ONE: silent (timed by the steps' own holds), for checking the pages and the turns. The
// narration (src/stories/day-one/narration-youtube.json, Liam) times it the same way as
// The Missing Piece: each line starts at the item carrying its mark (DAY_ONE_YOUTUBE below).
import {schedule} from '../../book/timeline';
import type {BookFilm} from '../../book/Book';
import {SHORT_SPREADS, SHORT_STEPS, SPREADS, STEPS} from './story';

const OUTRO = 210;
const S = schedule(STEPS);
export const DAY_ONE: BookFilm = {S, spreads: SPREADS, outro: OUTRO, total: S.end + OUTRO, paper: 'plain'};

/** With the local Kokoro test narration (am_michael, tags removed: narration-kokoro.json); each
 *  line starts at the drawn item carrying its mark, and the pencil waits for the narrator. */
import kokoroLines from './narration-kokoro.json';
import kokoroTiming from './narration-kokoro.timing.json';
const FPS = 30;
const voiceFrames = (durations: Record<string, number>) =>
  Object.fromEntries(Object.entries(durations).map(([id, sec]) => [id, Math.ceil(sec * FPS)]));
const SK = schedule(STEPS, kokoroLines, voiceFrames(kokoroTiming.durations));
export const DAY_ONE_KOKORO: BookFilm = {
  S: SK, spreads: SPREADS, outro: OUTRO, total: SK.end + OUTRO, paper: 'plain',
  voice: {dir: 'day-one/voice-kokoro', outroLine: 'keep'},
};

/** The Shorts / Reels cut (vertical), with the same Kokoro test narration. */
const SS = schedule(SHORT_STEPS, kokoroLines, voiceFrames(kokoroTiming.durations));
export const DAY_ONE_SHORT_KOKORO: BookFilm = {
  S: SS, spreads: SHORT_SPREADS, outro: 150, total: SS.end + 150, paper: 'plain',
  voice: {dir: 'day-one/voice-kokoro', outroLine: 'keep'},
};

/** The Shorts / Reels cut narrated by ElevenLabs "Liam - Energetic, Social Media Creator"
 *  (eleven_v3, narration-shorts.json, delivery tags). */
import shortsLines from './narration-shorts.json';
import shortsTiming from './narration-shorts.timing.json';
const LIAM = voiceFrames(shortsTiming.durations);
const SL = schedule(SHORT_STEPS, shortsLines, LIAM);
export const DAY_ONE_SHORT: BookFilm = {
  S: SL, spreads: SHORT_SPREADS, outro: 150, total: SL.end + 150, paper: 'plain',
  voice: {dir: 'day-one/voice-shorts', outroLine: 'keep', frames: LIAM},
  music: 'day-one/music/score-shorts.m4a',
};

/** The full film (16:9, YouTube) narrated by Liam (eleven_v3, narration-youtube.json, every line
 *  tagged from the lines around it), with its own fitted score. */
import youtubeLines from './narration-youtube.json';
import youtubeTiming from './narration-youtube.timing.json';
const LIAM_FULL = voiceFrames(youtubeTiming.durations);
const SY = schedule(STEPS, youtubeLines, LIAM_FULL);
export const DAY_ONE_YOUTUBE: BookFilm = {
  S: SY, spreads: SPREADS, outro: OUTRO, total: SY.end + OUTRO, paper: 'plain',
  voice: {dir: 'day-one/voice-youtube', outroLine: 'keep', frames: LIAM_FULL},
  music: 'day-one/music/score-youtube.m4a',
};
