// The films built from the current story. To start a new story, copy src/stories/layoff to
// src/stories/<name>, generate its media into public/<name>, and point these definitions at it.
import type {DrawItem, Narration} from '../pencil/draw';
import * as long from './layoff/story';
import * as short from './layoff/short';
import narrationLong from './layoff/narration.json';
import timingLong from './layoff/narration.timing.json';
import narrationShort from './layoff/narration-short.json';
import timingShort from './layoff/narration-short.timing.json';

export type StoryDef = {
  story: string;
  items: DrawItem[];
  worldH: number;
  narration: Narration[];
  timing: {durations: Record<string, number>};
  voiceDir: string; // under public/
  music: string; // under public/
  speedScale: number;
  outroFrames: number; // final zoom-out + "Keep going" card
  /** fade the music down for the daughter's question (when the score itself isn't quiet enough there) */
  quietAtVoice?: boolean;
  hook: {lines: string[]; red: string[]};
};

const HOOK = {lines: ['20 YEARS.'], red: ['REPLACED', 'BY AI.']};

export const LONG: StoryDef = {
  story: 'layoff', items: long.ITEMS, worldH: long.WORLD_H, narration: narrationLong, timing: timingLong,
  voiceDir: 'layoff/voice', music: 'layoff/music/score.m4a', speedScale: 1, outroFrames: 250, hook: HOOK,
};
export const SHORT: StoryDef = {
  story: 'layoff', items: short.ITEMS, worldH: short.WORLD_H, narration: narrationShort, timing: timingShort,
  voiceDir: 'layoff/voice-short', music: 'layoff/music/score-short.m4a', speedScale: 2.8, outroFrames: 170, hook: HOOK, quietAtVoice: true,
};

// kept for scripts that only look at the long version
export const STORY = 'layoff';
export const ITEMS = LONG.items;
export const WORLD_H = LONG.worldH;
export const NARRATION = LONG.narration;
export const TIMING = LONG.timing;
