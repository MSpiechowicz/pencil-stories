// The schedule for a film, computed once: when every stroke is drawn, when each narration line
// plays, and where the camera looks on every frame. One film per version (long / short).
import {focusAt, plan} from './draw';
import {LONG, REEL, SHORT, WIDE as WIDE_STORY, type StoryDef} from '../stories/current';
import {HOOK_H} from './Hook';

export const FPS = 30;
export const ZOOM_FRAMES = 110;
/** frames after OUTRO_START when the closing title fades in (the closing line is spoken then) */
export const TITLE_IN = 72;
export const VOICE_LEAD = 3; // frames of silence at the start of each narration file
const VOICE_TAIL = 9; // frames of silence at the end
/**
 * The 16:9 version (desktop / TV), rendered natively in 2K (2560x1440): the story column drawn
 * in the middle of a full-width page, with 1543 page units of height visible (the framing chosen
 * at 1080p, 0.7 scale); the pencil is kept at 66% of the height (planned and checked with the
 * same camera rules as the phone video).
 */
export const WIDE = {w: 2560, h: 1440, scale: (0.7 * 1440) / 1080, focus: 0.66} as const;

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
  // with a held hook the camera glides down for 75 frames after the hold; the pencil starts once
  // the glide is ~80% there, so nothing is drawn below the frame while the camera still rests
  const glideLen = s.hookGlide ?? 75;
  const drawDelay = s.hookHold !== undefined ? s.hookHold + Math.round(0.8 * glideLen) : 0;
  const PLAN = plan(s.items, s.narration, VOICE_FRAMES, s.speedScale, drawDelay);
  // The closing line ("Keep going.") is spoken together with the closing title, not when the
  // last heart is drawn: the outro starts after the drawing and the other lines, then the title
  // fades in and the line is spoken with it.
  const closing = new Set(s.narration.filter((n) => n.mark === 'outro').map((n) => n.id));
  const lastVoiceEnd = Math.max(0, ...PLAN.voice.filter((v) => !closing.has(v.id)).map((v) => v.start + VOICE_FRAMES[v.id]));
  const drawEnd = PLAN.slots[PLAN.slots.length - 1].end;
  const OUTRO_START = Math.ceil(Math.max(drawEnd, lastVoiceEnd) + 24);
  for (const v of PLAN.voice) if (closing.has(v.id)) v.start = OUTRO_START + TITLE_IN;
  const TOTAL_FRAMES = OUTRO_START + s.outroFrames;
  const worldH = s.worldH + HOOK_H; // the hook sits at the top of the page
  /**
   * Camera top edge per frame, for a view `viewH` page units tall (1920 for the phone video,
   * less for the wide one). It never moves back up (no bobbing while the pencil draws a head and
   * then the feet) and it is planned in advance, so the smoothing looks ahead.
   */
  const cameraFor = (viewH: number, focusAtFraction = 0.6) => {
    const focusY = focusAtFraction * viewH;
    const clampCam = (y: number) => Math.min(worldH - viewH, Math.max(0, y));
    const focus = (f: number) => clampCam(HOOK_H + focusAt(PLAN.slots, Math.min(f, PLAN.end)).y - focusY);
    // 1) hold on the hook, then one eased glide (3 s) that arrives just as the pencil starts
    // the hook holds still for 1.5 s, or (hookHold) until its line has been spoken and has landed
    const glideStart = s.hookHold !== undefined ? PLAN.hookEnd + s.hookHold : 45;
    const glideEnd = Math.max(PLAN.hookEnd + 40, glideStart + (s.hookHold !== undefined ? glideLen : 90));
    const firstView = focus(glideEnd);
    // where the hook is framed: the tall video starts at the page top; a shorter view centres the hook
    const hookView = clampCam(viewH >= 1920 ? 0 : (HOOK_H - viewH) / 2 + 40);
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
    return story.map((y, f) => {
      if (f <= glideStart) return hookView;
      if (f < glideEnd) return hookView + (target - hookView) * ease((f - glideStart) / (glideEnd - glideStart));
      // hand over to the story camera over 1 s so its speed builds up gently
      const k = Math.min(1, (f - glideEnd) / 30);
      return target + (y - target) * k * k * (3 - 2 * k);
    }).map(Math.round); // whole pixels: thin ink lines don't shimmer between pixel rows
  };
  const CAMERA = cameraFor(1920);
  const CAMERA_WIDE = cameraFor(WIDE.h / WIDE.scale, WIDE.focus);
  return {def: s, PLAN, VOICE_FRAMES, OUTRO_START, TOTAL_FRAMES, CAMERA, CAMERA_WIDE, cameraFor, WORLD_H: worldH};
};

export type Film = ReturnType<typeof makeFilm>;
export const FILMS = {long: makeFilm(LONG), short: makeFilm(SHORT), wide: makeFilm(WIDE_STORY), reel: makeFilm(REEL)};
export type Variant = keyof typeof FILMS;

// long version, for scripts written before the short cut existed
export const {PLAN, VOICE_FRAMES, OUTRO_START, TOTAL_FRAMES, CAMERA} = FILMS.long;
