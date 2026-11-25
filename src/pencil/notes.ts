// Sticky notes: one reusable object for every story, drawn with the same ink as everything else
// (outlines, hatching, a few flat paper tints). `style` picks the look; the handwriting is turned
// with the note.
import type {DrawItem} from './draw';
import {INK, PAPER, RED} from './art';
import {circ, place, rr} from './geo';

export type NoteStyle = 'tape' | 'pin' | 'pencil' | 'card' | 'pad';
export const NOTE_STYLES: NoteStyle[] = ['tape', 'pin', 'pencil', 'card', 'pad'];

const NOTE_TINT = '#fbf0c4';
const NOTE_HATCH = '#e9b949';
const FOLD_TINT = '#efdc9e'; // the back of the folded corner, a shade darker
const CARD_RULE = '#c3d3e8';
const f1 = (n: number) => n.toFixed(1);

/** Diagonal hatching (/) cut exactly to the rectangle [L, R] x [T, B]: only visible strokes. */
const hatchRect = (L: number, T: number, R: number, B: number, step: number): string => {
  const h = B - T;
  let d = '';
  for (let c = L + step / 2; c < R + h; c += step) {
    // segment from (c, T) to (c - h, B): x = c - h t, y = T + h t, clipped to L <= x <= R
    const t0 = Math.max(0, (c - R) / h);
    const t1 = Math.min(1, (c - L) / h);
    if (t1 - t0 < 0.02) continue;
    d += `M${f1(c - h * t0)} ${f1(T + h * t0)} L${f1(c - h * t1)} ${f1(T + h * t1)} `;
  }
  return d;
};

type Pt2 = {x: number; y: number};
/** Diagonal hatching (/) inside any polygon, cut exactly at its outline (only visible strokes). */
const hatchPoly = (poly: Pt2[], step: number): string => {
  const xs = poly.map((q) => q.x);
  const ys = poly.map((q) => q.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const h = y1 - y0;
  let d = '';
  for (let k = step / 2; k < x1 - x0 + h; k += step) {
    const A = {x: x0 + k, y: y0};
    const B = {x: x0 + k - h, y: y1};
    const ts: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const c = poly[i];
      const e = poly[(i + 1) % poly.length];
      const den = (B.x - A.x) * (e.y - c.y) - (B.y - A.y) * (e.x - c.x);
      if (Math.abs(den) < 1e-9) continue;
      const t = ((c.x - A.x) * (e.y - c.y) - (c.y - A.y) * (e.x - c.x)) / den;
      const u = ((c.x - A.x) * (B.y - A.y) - (c.y - A.y) * (B.x - A.x)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u < 1) ts.push(t);
    }
    ts.sort((a, b) => a - b);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      if ((ts[i + 1] - ts[i]) * h < 3) continue;
      d += `M${f1(A.x + (B.x - A.x) * ts[i])} ${f1(A.y + (B.y - A.y) * ts[i])} L${f1(A.x + (B.x - A.x) * ts[i + 1])} ${f1(A.y + (B.y - A.y) * ts[i + 1])} `;
    }
  }
  return d;
};
const polyD = (poly: Pt2[]) => `M${poly.map((q) => `${f1(q.x)} ${f1(q.y)}`).join(' L')} Z`;

export type NoteOpts = {
  w?: number; h?: number; rot?: number; size?: number;
  /** ink colour of the handwriting */
  color?: string;
  style?: NoteStyle;
};

/** A sticky note centred at (x, y) with handwritten lines on it. */
export const note = (x: number, y: number, lines: string[], o: NoteOpts = {}): DrawItem[] => {
  const w = o.w ?? 340;
  const h = o.h ?? 200;
  const rot = o.rot ?? 0;
  const size = o.size ?? 46;
  const style = o.style ?? 'tape';
  const at = {x, y, rot};
  const P = (d: string) => place(d, at);
  const L = -w / 2;
  const R = w / 2;
  const T = -h / 2;
  const B = h / 2;
  const cu = Math.min(40, h * 0.2); // folded corner size
  const curled = `M${L} ${T} L${R} ${T} L${R} ${B - cu} L${R - cu} ${B} L${L} ${B} Z`;
  // the corner folded over: a flat triangle lying on the note (dog-ear)
  const curl: DrawItem = {d: P(`M${R} ${B - cu} L${R - cu} ${B - cu} L${R - cu} ${B} Z`), color: INK, w: 4, fill: style === 'card' ? '#ecebe4' : FOLD_TINT, speed: 120};
  const out: DrawItem[] = [];
  let textTop = 0; // extra room taken at the top (tape, header)

  switch (style) {
    case 'tape': {
      const tw = Math.min(110, w * 0.34);
      out.push({d: P(curled), color: INK, w: 5, fill: NOTE_TINT, speed: 180}, curl,
        {d: P(`M${-tw / 2} ${T - 16} L${tw / 2} ${T - 22} L${tw / 2 + 3} ${T + 14} L${-tw / 2 + 3} ${T + 20} Z`), color: INK, w: 3.5, fill: PAPER, fillOpacity: 0.75, opacity: 0.85, speed: 160});
      textTop = h * 0.04;
      break;
    }
    case 'pin': {
      // pinned to the page: the note lifts off the paper, so it throws a pencil-hatched shadow
      // down and to the right (the visible strip only, following the folded corner); the red
      // push pin throws a little shadow of its own
      const sx = 12;
      const sy = 14;
      const band = [
        {x: R, y: T + sy}, {x: R + sx, y: T + sy}, {x: R + sx, y: B - cu + sy}, {x: R - cu + sx, y: B + sy},
        {x: L + sx, y: B + sy}, {x: L + sx, y: B}, {x: R - cu, y: B}, {x: R, y: B - cu},
      ];
      out.push(
        {d: P(hatchPoly(band, 6)), clip: P(polyD(band)), color: INK, w: 2.5, opacity: 0.32, speed: 600},
        {d: P(curled), color: INK, w: 5, fill: NOTE_TINT, speed: 180}, curl,
        {d: P(`M6 ${T + 24} Q14 ${T + 30} 22 ${T + 28}`), color: INK, w: 6, opacity: 0.18, speed: 80},
        {d: P(`M0 ${T + 16} L0 ${T + 28}`), color: INK, w: 3.5, speed: 80},
        {d: P(circ(0, T + 8, 13)), color: RED, w: 4.5, fill: RED, speed: 80},
        {d: P(circ(-4, T + 4, 3.5)), color: PAPER, w: 2, fill: PAPER, speed: 80},
      );
      textTop = h * 0.06;
      break;
    }
    case 'pencil': {
      // coloured in with a yellow pencil: no flat fill, light hatching inside the ink outline
      out.push(
        {d: P(curled), color: INK, w: 5, fill: PAPER, speed: 180},
        {d: P(hatchRect(L + 8, T + 8, R - cu - 4, B - 8, 12)), color: NOTE_HATCH, w: 3.5, opacity: 0.55, speed: 420},
        {d: P(hatchRect(R - cu - 4, T + 8, R - 8, B - cu - 4, 12)), color: NOTE_HATCH, w: 3.5, opacity: 0.55, speed: 420},
        curl,
      );
      break;
    }
    case 'card': {
      // an index card: white, red header rule, blue lines, held by a paper clip
      const head = T + Math.min(54, h * 0.26);
      let rules = '';
      for (let yy = head + 40; yy < B - 10; yy += 40) rules += `M${L + 10} ${f1(yy)} L${R - 10} ${f1(yy)} `;
      out.push(
        {d: P(rr(L, T, w, h, 4)), color: INK, w: 5, fill: PAPER, speed: 180},
        {d: P(`M${L + 4} ${head} L${R - 4} ${head}`), color: RED, w: 3, opacity: 0.7, speed: 300},
        ...(rules ? [{d: P(rules), color: CARD_RULE, w: 2.5, speed: 500} as DrawItem] : []),
        {d: P(`M${L + 40} ${T + 36} L${L + 40} ${T - 22} Q${L + 40} ${T - 34} ${L + 52} ${T - 34} Q${L + 64} ${T - 34} ${L + 64} ${T - 22} L${L + 64} ${T + 26} Q${L + 64} ${T + 32} ${L + 58} ${T + 32} Q${L + 52} ${T + 32} ${L + 52} ${T + 26} L${L + 52} ${T - 14}`), color: INK, w: 4, speed: 90},
      );
      textTop = h * 0.08;
      break;
    }
    case 'pad': {
      // torn off a notepad: a ragged top edge, the sheets of the pad peeking out behind
      const n = Math.max(6, Math.round(w / 26));
      let torn = `M${L} ${T + 6}`;
      for (let k = 1; k <= n; k++) torn += ` L${f1(L + (w * k) / n)} ${T + (k % 2 ? 0 : 8)}`;
      out.push(
        {d: P(`M${L + 8} ${T + 12} L${L + 8} ${B + 10} L${R + 8} ${B + 10} L${R + 8} ${T + 12}`), color: INK, w: 3.5, fill: PAPER, speed: 220},
        {d: P(`${torn} L${R} ${B - cu} L${R - cu} ${B} L${L} ${B} Z`), color: INK, w: 5, fill: NOTE_TINT, speed: 180},
        curl,
      );
      break;
    }
  }

  const lh = size * 1.12;
  const y0 = y - ((lines.length - 1) * lh) / 2 + size * 0.32 + textTop;
  lines.forEach((line, i) => {
    out.push({text: line, x, y: y0 + i * lh, size, color: o.color ?? INK, center: true, speed: 60, rot, pivot: {x, y}});
  });
  return out;
};
