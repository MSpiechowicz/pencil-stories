// The films built from the current story. To start a new story, copy src/stories/layoff to
// src/stories/<name>, generate its media into public/<name>, and point these definitions at it.
import type {DrawItem, Narration} from '../pencil/draw';
import * as long from './layoff/story';
import * as short from './layoff/short';
import narrationLong from './layoff/narration.json';
import timingLong from './layoff/narration.timing.json';
import narrationShort from './layoff/narration-short.json';
import timingShort from './layoff/narration-short.timing.json';
import narrationWide from './layoff/narration-wide.json';
import timingWide from './layoff/narration-wide.timing.json';
import narrationReel from './layoff/narration-reel.json';
import timingReel from './layoff/narration-reel.timing.json';

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
  /** frames the camera stays on the hook after its line ends (default: it leaves at 1.5 s) */
  hookHold?: number;
  /** frames of the glide from the hook into the story when hookHold is set (default 75) */
  hookGlide?: number;
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

/** The 16:9 2K full video: the long story, narrated by David (Deep, Cinematic, Documentary) with
 * emotional direction, with its own score composed for this timeline. The phone videos keep Brian. */
export const WIDE: StoryDef = {
  ...LONG, narration: narrationWide, timing: timingWide,
  voiceDir: 'layoff/voice-wide', music: 'layoff/music/score-wide.m4a',
  hookHold: 30, // let "…replaced by A.I." land for a second before the camera moves
};

/** The short (YouTube Shorts 1440x2560 / Reels 1080x1920): the short cut narrated by David, with
 * the same direction, breaths and held hook as the wide film, and its own score. Brian's short
 * (SHORT) stays available. */
export const REEL: StoryDef = {
  ...SHORT, narration: narrationReel, timing: timingReel,
  voiceDir: 'layoff/voice-reel', music: 'layoff/music/score-reel.m4a',
  hookHold: 15, hookGlide: 50,
};

// kept for scripts that only look at the long version
export const STORY = 'layoff';
export const ITEMS = LONG.items;
export const WORLD_H = LONG.worldH;
export const NARRATION = LONG.narration;
export const TIMING = LONG.timing;
