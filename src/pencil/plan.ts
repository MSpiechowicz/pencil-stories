// The schedule for a film, computed once: when every stroke is drawn, when each narration line
// plays, and where the camera looks on every frame. One film per version (long / short).
import {focusAt, plan} from './draw';
import {LONG, SHORT, type StoryDef} from '../stories/current';
import {HOOK_H} from './Hook';

export const FPS = 30;
export const ZOOM_FRAMES = 110;
/** frames after OUTRO_START when the closing title fades in (the closing line is spoken then) */
export const TITLE_IN = 72;
export const VOICE_LEAD = 3; // frames of silence at the start of each narration file
const VOICE_TAIL = 9; // frames of silence at the end
const FOCUS_Y = 0.6 * 1920;

/** Box blur with edge clamping (one pass). */
const blur = (a: number[], r: number) => {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += a[Math.min(a.length - 1, Math.max(0, i + k))];
    out[i] = sum / (2 * r + 1);
  }
  return out;
};

const makeFilm = (s: StoryDef) => {
  // narration files carry 0.1 s of air before and 0.3 s after the words (click-free edges);
  // schedule on the spoken part only, so the padding overlaps neighbours instead of adding time
  const VOICE_FRAMES: Record<string, number> = Object.fromEntries(
    Object.entries(s.timing.durations).map(([k, v]) => [k, Math.max(6, Math.ceil(v * FPS) - VOICE_LEAD - VOICE_TAIL)]),
  );
  const PLAN = plan(s.items, s.narration, VOICE_FRAMES, s.speedScale);
  // The closing line ("Keep going.") is spoken together with the closing title, not when the
  // last heart is drawn: the outro starts after the drawing and the other lines, then the title
  // fades in and the line is spoken with it.
  const closing = new Set(s.narration.filter((n) => n.mark === 'outro').map((n) => n.id));
  const lastVoiceEnd = Math.max(0, ...PLAN.voice.filter((v) => !closing.has(v.id)).map((v) => v.start + VOICE_FRAMES[v.id]));
  const drawEnd = PLAN.slots[PLAN.slots.length - 1].end;
  const OUTRO_START = Math.ceil(Math.max(drawEnd, lastVoiceEnd) + 24);
  for (const v of PLAN.voice) if (closing.has(v.id)) v.start = OUTRO_START + TITLE_IN;
  const TOTAL_FRAMES = OUTRO_START + s.outroFrames;
  /**
   * Camera top edge per frame. It never moves back up (no bobbing while the pencil draws a
   * head and then the feet) and it is planned in advance, so the smoothing looks ahead.
   */
  const worldH = s.worldH + HOOK_H; // the hook sits at the top of the page
  const clampCam = (y: number) => Math.min(worldH - 1920, Math.max(0, y));
  const focus = (f: number) => clampCam(HOOK_H + focusAt(PLAN.slots, Math.min(f, PLAN.end)).y - FOCUS_Y);
  // 1) hold on the hook, then one eased glide (3 s) that arrives just as the pencil starts
  const glideStart = 45; // the hook holds still for the first 1.5 s
  const glideEnd = Math.max(PLAN.hookEnd + 40, glideStart + 90);
  const firstView = focus(glideEnd);
  // 2) afterwards: never move up, smoothed with look-ahead
  const raw: number[] = [];
  let lowest = firstView;
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    if (f > glideEnd) lowest = Math.max(lowest, focus(f));
    raw.push(lowest);
  }
  // long, strong smoothing: the scroll speed changes very gradually (no stop-and-go)
  const story = blur(blur(blur(raw, 60), 60), 60);
  const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2; // gentle sine glide
  // glide to exactly where the smoothed story camera is at hand-over: no jump
  const target = story[glideEnd];
  const CAMERA = story.map((y, f) => {
    if (f <= glideStart) return 0;
    if (f < glideEnd) return target * ease((f - glideStart) / (glideEnd - glideStart));
    // hand over to the story camera over 1 s so its speed builds up gently
    const k = Math.min(1, (f - glideEnd) / 30);
    return target + (y - target) * k * k * (3 - 2 * k);
  }).map(Math.round); // whole pixels: thin ink lines don't shimmer between pixel rows
  return {def: s, PLAN, VOICE_FRAMES, OUTRO_START, TOTAL_FRAMES, CAMERA, WORLD_H: worldH};
};

export type Film = ReturnType<typeof makeFilm>;
export const FILMS = {long: makeFilm(LONG), short: makeFilm(SHORT)};
export type Variant = keyof typeof FILMS;

// long version, for scripts written before the short cut existed
export const {PLAN, VOICE_FRAMES, OUTRO_START, TOTAL_FRAMES, CAMERA} = FILMS.long;
