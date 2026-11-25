// The schedule of a book film (pure, no React): which spread is open, when pages turn, and when
// each stroke is drawn. A story is a list of steps; each step goes to a spread (turning pages
// forward or back to get there), draws on its left and/or right page, then holds so it can be read.
// Drawing added to a spread stays there: turning back to it later shows it as it was left.
import {plan, type DrawItem, type Narration, type Slot} from '../pencil/draw';

export type Step = {
  /** beat id: a narration line with this id will later set this step's timing */
  id: string;
  spread: number;
  left?: DrawItem[];
  right?: DrawItem[];
  /** frames to stay after the drawing (reading time) */
  hold?: number;
  /** frames per page turn on the way to this spread */
  flip?: number;
  /** frames between turns when several pages are turned in a row */
  flipGap?: number;
  /** reach the spread in ONE turn of a whole block of pages (grabbing everything read so far and
   *  swinging it over), instead of page by page */
  jump?: boolean;
  /** draw the right page before the left (so narration anchored on both follows the story order) */
  rightFirst?: boolean;
  /** >1 draws faster */
  speed?: number;
  /** frames between arriving and the first stroke */
  pause?: number;
};

/** `pages` > 1: a block of that many sheets turned together */
export type Turn = {from: number; to: number; dir: 1 | -1; start: number; end: number; pages: number};
export type Side = 'left' | 'right';

export const FLIP = 34;

/**
 * Narration (optional): each line has a `mark`; the drawn item carrying the same mark starts the
 * line, and the pencil waits there until the narrator has finished the previous line (the same rule
 * as the long-page films, see draw.ts `plan`). `voice` = each line's length in frames, by line id.
 * A step holds until its last line has been spoken plus a breath, or for its own `hold` after the
 * drawing, whichever is later.
 */
export const BREATH = 15;
export const schedule = (steps: Step[], narration: Narration[] = [], voice: Record<string, number> = {}) => {
  let busy = 0; // the narrator speaks until this frame
  const lines: {id: string; start: number}[] = [];
  const pages: Record<number, {left: Slot[]; right: Slot[]}> = {};
  const page = (s: number) => (pages[s] ??= {left: [], right: []});
  const turns: Turn[] = [];
  const arrivals: {spread: number; at: number}[] = [];
  const beats: Record<string, {start: number; drawEnd: number; end: number}> = {};
  let t = 0;
  let at = steps[0].spread;
  let uid = 0;
  arrivals.push({spread: at, at: 0});
  for (const st of steps) {
    const beatStart = t;
    // turn page by page to the step's spread
    const flip = st.flip ?? FLIP;
    if (st.jump && at !== st.spread) {
      const dir: 1 | -1 = st.spread > at ? 1 : -1;
      turns.push({from: at, to: st.spread, dir, start: t, end: t + flip, pages: Math.abs(st.spread - at)});
      t += flip;
      at = st.spread;
      arrivals.push({spread: at, at: t});
    }
    while (at !== st.spread) {
      const dir: 1 | -1 = st.spread > at ? 1 : -1;
      turns.push({from: at, to: at + dir, dir, start: t, end: t + flip, pages: 1});
      t += flip;
      at += dir;
      arrivals.push({spread: at, at: t});
      if (at !== st.spread) t += st.flipGap ?? 2;
    }
    t += st.pause ?? (turns.length && turns[turns.length - 1].end === t ? 10 : 0);
    let spoke = false;
    for (const side of st.rightFirst ? (['right', 'left'] as const) : (['left', 'right'] as const)) {
      const items = st[side];
      if (!items?.length) continue;
      const marks = new Set(items.map((it) => it.mark).filter(Boolean));
      const said = narration.filter((n) => marks.has(n.mark) && voice[n.id]);
      const pl = plan(items, said, voice, st.speed ?? 1, 0, Math.max(0, busy - t));
      const off = t;
      for (const s of pl.slots) page(st.spread)[side].push({...s, i: uid++, start: s.start + off, end: s.end + off});
      for (const v of pl.voice) {
        lines.push({id: v.id, start: v.start + off});
        busy = Math.max(busy, v.start + off + voice[v.id]);
        spoke = true;
      }
      t = Math.ceil(pl.slots[pl.slots.length - 1].end + off + 6); // whole frames: turns start on a frame
    }
    const drawEnd = t;
    t = Math.ceil(Math.max(t + (st.hold ?? 45), spoke ? busy + BREATH : 0)); // whole frames
    beats[st.id] = {start: beatStart, drawEnd, end: t};
  }
  return {pages, turns, arrivals, beats, lines, end: t, page};
};

export type Schedule = ReturnType<typeof schedule>;

/** The spread lying open at frame f (between turns), and the turn in progress, if any. */
export const stateAt = (S: Schedule, f: number): {spread: number; turn: Turn | null; p: number} => {
  for (const tr of S.turns) if (f >= tr.start && f < tr.end) return {spread: tr.from, turn: tr, p: (f - tr.start) / (tr.end - tr.start)};
  let spread = S.arrivals[0].spread;
  for (const a of S.arrivals) if (a.at <= f) spread = a.spread;
  return {spread, turn: null, p: 0};
};
