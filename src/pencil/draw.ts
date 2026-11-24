// The single-pencil engine (pure functions, no React): turns an ordered list of things to draw
// into a schedule, and answers "where is the pencil / the camera at frame f".
import {getLength, getPointAtLength} from '@remotion/paths';

export type Pt = {x: number; y: number};

export type DrawItem = {
  /** a path to draw... */
  d?: string;
  /** ...or a handwritten line of text (x, y = baseline start) */
  text?: string;
  x?: number;
  y?: number;
  size?: number;
  weight?: number;
  /** clip the stroke to this outline (e.g. shading that must stay inside a cloud) */
  clip?: string;
  /** text only: x is the centre of the line instead of its start */
  center?: boolean;
  color?: string;
  /** stroke width (default 5) */
  w?: number;
  /** fill shown once the outline is finished */
  fill?: string;
  fillOpacity?: number;
  opacity?: number;
  /** outlined tube (limbs, torsos): outer width; inner is filled with `inner` (paper) */
  tube?: number;
  inner?: string;
  /** px per frame */
  speed?: number;
  /** a story marker: narration with the same mark starts here, and the pencil waits for the
   *  previous narration line to finish before starting this item */
  mark?: string;
  /** extra frames to wait before this item */
  pause?: number;
};

export type Slot = {item: DrawItem; i: number; start: number; end: number; len: number; p0: Pt; p1: Pt; x0: number; x1: number};

export const SPEED = 115; // px of line per frame
const AIR = 140; // px per frame in the air between strokes
const HIDE_GAP = 40; // longer pauses: the pencil steps off the paper
const TEXT_SPEED = 44; // px of handwriting width per frame
export const CHAR_W = 0.43; // Caveat bold, average advance per char in em

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2;
};
const lerp = (a: Pt, b: Pt, t: number): Pt => {
  const e = ease(t);
  return {x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e};
};

export const textWidth = (it: DrawItem) => (it.text ?? '').length * (it.size ?? 56) * CHAR_W;

/** `gap`: seconds of silence before this line (after the previous one); the drawing of its section waits for it too */
export type Narration = {id: string; mark: string; text: string; speed?: number; gap?: number};

export type Plan = {slots: Slot[]; voice: {id: string; start: number}[]; marks: Record<string, number>; end: number; hookEnd: number};

/**
 * Schedule every item. `voiceDur` (frames) lets the drawing wait for the narrator.
 * A narration line with mark "hook" plays over the opening hook card; drawing starts after it.
 * `speedScale` > 1 draws faster (used by the short version).
 */
/** `drawDelay`: frames after the hook before the pencil starts (lets the camera arrive first) */
export const plan = (items: DrawItem[], narration: Narration[], voiceDur: Record<string, number>, speedScale = 1, drawDelay = 0): Plan => {
  const slots: Slot[] = [];
  const voice: {id: string; start: number}[] = [];
  const marks: Record<string, number> = {};
  let voiceEnd = 0;
  for (const n of narration.filter((n) => n.mark === 'hook')) {
    voice.push({id: n.id, start: 6});
    voiceEnd = 6 + (voiceDur[n.id] ?? 60);
  }
  const hookEnd = voiceEnd > 0 ? voiceEnd + 2 : 0;
  let t = hookEnd + drawDelay;
  let prev: Slot | null = null;
  items.forEach((item, i) => {
    let len: number;
    let p0: Pt;
    let p1: Pt;
    let x0 = 0;
    let x1 = 0;
    if (item.text !== undefined) {
      const size = item.size ?? 56;
      x0 = item.center ? item.x! - textWidth(item) / 2 : item.x!;
      x1 = x0 + textWidth(item);
      len = x1 - x0;
      p0 = {x: x0, y: item.y! - size * 0.35};
      p1 = {x: x1, y: item.y! - size * 0.35};
    } else {
      len = getLength(item.d!);
      p0 = getPointAtLength(item.d!, 0) ?? {x: 0, y: 0};
      p1 = getPointAtLength(item.d!, len) ?? p0;
    }
    const travel = prev ? Math.min(14 / speedScale, Math.max(2 / speedScale, dist(prev.p1, p0) / (AIR * speedScale))) : 0;
    let start = t + travel + (item.pause ?? 0);
    if (item.mark) {
      // `pause` on a marked item is also a breath after the previous narration line
      const gap = Math.max(6, ...narration.filter((n) => n.mark === item.mark).map((n) => Math.round((n.gap ?? 0) * 30)));
      start = Math.max(start, voiceEnd + gap + (item.pause ?? 0));
      marks[item.mark] = start;
      for (const n of narration.filter((n) => n.mark === item.mark)) {
        const vs = Math.max(start, voiceEnd + 6);
        voice.push({id: n.id, start: vs});
        voiceEnd = vs + (voiceDur[n.id] ?? 60);
      }
    }
    const speed = (item.speed ?? (item.text !== undefined ? TEXT_SPEED : SPEED)) * speedScale;
    const end = start + Math.max(3 / speedScale, len / speed);
    const slot: Slot = {item, i, start, end, len, p0, p1, x0, x1};
    slots.push(slot);
    t = end;
    prev = slot;
  });
  return {slots, voice, marks, end: Math.max(t, voiceEnd), hookEnd};
};

export const progressOf = (s: Slot, f: number) => ease((f - s.start) / (s.end - s.start));

const pointOn = (s: Slot, p: number): Pt => {
  if (s.item.text !== undefined) {
    const size = s.item.size ?? 56;
    return {x: s.x0 + (s.x1 - s.x0) * p, y: s.p0.y + Math.sin(p * (s.x1 - s.x0) * 0.09) * size * 0.2};
  }
  return getPointAtLength(s.item.d!, s.len * p) ?? s.p1;
};

/** Pencil tip position, or null when the pencil is off the paper. */
export const pencilAt = (slots: Slot[], f: number, off: Pt): Pt | null => {
  if (!slots.length) return null;
  const first = slots[0];
  const last = slots[slots.length - 1];
  if (f < first.start - 10) return null;
  if (f < first.start) return lerp(off, first.p0, (f - (first.start - 10)) / 10);
  // binary search for the slot at or before f
  let lo = 0;
  let hi = slots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (slots[mid].start <= f) lo = mid;
    else hi = mid - 1;
  }
  const s = slots[lo];
  if (f < s.end) return pointOn(s, progressOf(s, f));
  const next = slots[lo + 1];
  if (!next) return f < last.end + 10 ? lerp(last.p1, off, (f - last.end) / 10) : null;
  const gap = next.start - s.end;
  if (gap > HIDE_GAP) {
    if (f < s.end + 10) return lerp(s.p1, off, (f - s.end) / 10);
    if (f >= next.start - 10) return lerp(off, next.p0, (f - (next.start - 10)) / 10);
    return null;
  }
  const travel = Math.min(gap, Math.max(2, dist(s.p1, next.p0) / AIR));
  if (f < next.start - travel) return s.p1;
  return lerp(s.p1, next.p0, (f - (next.start - travel)) / travel);
};

/** Where the camera should look: the pencil, or the next thing to be drawn while it rests. */
export const focusAt = (slots: Slot[], f: number): Pt => {
  let lo = 0;
  let hi = slots.length - 1;
  if (f <= slots[0].start) return slots[0].p0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (slots[mid].start <= f) lo = mid;
    else hi = mid - 1;
  }
  const s = slots[lo];
  if (f < s.end) return pointOn(s, progressOf(s, f));
  const next = slots[lo + 1];
  if (!next) return s.p1;
  return lerp(s.p1, next.p0, (f - s.end) / Math.max(1, next.start - s.end));
};
