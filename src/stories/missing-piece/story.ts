// "The Missing Piece": a mother's ordinary days fill a sketchbook, the complaints pile up, and on
// the night she breaks down the book turns BACK through its pages and adds what she didn't see,
// on sticky notes stuck over the old drawings. Then it flips forward to a new page.
//
// Each page has its own coordinates: x 0..1000, y 0..1300 (see src/book). Handwriting sits on the
// ruled lines (R(k)). The outer margin is at x 96 on right pages and x 901 on left pages.
// Step ids are beats: a narration line with the same id will later set that step's timing.
import type {DrawItem} from '../../pencil/draw';
import {AMBER, DESK_TOP, INK, PAPER, RED, check, clock, heart, laptopBack, moon, mug, windowFrame} from '../../pencil/art';
import {marks, seatedAtDesk, stick, tinyStick} from '../../pencil/stick';
import {note, type NoteOpts} from '../../pencil/notes';
import {circ, place, rr} from '../../pencil/geo';
import type {Step} from '../../book/timeline';

/** Mark the first of a group of items: the narration line with this mark starts there. */
const mk = (mark: string, items: DrawItem[]): DrawItem[] => items.map((it, k) => (k ? it : {...it, mark}));

/** baseline of ruled line k */
const R = (k: number) => 84 + 72 * k;
const T = (text: string, x: number, y: number, size = 58, color = INK, extra: Partial<DrawItem> = {}): DrawItem => ({text, x, y, size, color, ...extra});
const C = (text: string, x: number, y: number, size = 58, color = INK, extra: Partial<DrawItem> = {}): DrawItem => T(text, x, y, size, color, {center: true, ...extra});
const L0 = 120; // left page text start
const R0 = 150; // right page text start

/* ----------------------------------- props ----------------------------------- */

/* ---- jigsaw ---- */
type Q2 = {x: number; y: number};
/** Classic knob profile along an edge from u = 0 to 1 (v = distance off the edge, in edge lengths):
 *  a narrow neck and a round head wider than the neck. */
const KNOB: [number, number][][] = [
  [[0.42, 0], [0.44, -0.07], [0.41, -0.13]],
  [[0.36, -0.23], [0.4, -0.32], [0.5, -0.32]],
  [[0.6, -0.32], [0.64, -0.23], [0.59, -0.13]],
  [[0.56, -0.07], [0.58, 0], [0.64, 0]],
];
const f1 = (n: number) => n.toFixed(1);
/** Path commands (no M) for one edge from P to Q. sgn +1: the knob sticks out on the left of the
 *  direction of travel (up for an edge drawn to the right); -1: the other way; 0: straight. */
const edge = (P: Q2, Q: Q2, sgn: number): string => {
  if (!sgn) return `L${f1(Q.x)} ${f1(Q.y)}`;
  const d = {x: Q.x - P.x, y: Q.y - P.y};
  const n = {x: d.y * sgn, y: -d.x * sgn};
  const at = ([u, v]: [number, number]) => `${f1(P.x + d.x * u + n.x * -v)} ${f1(P.y + d.y * u + n.y * -v)}`;
  return `L${at([0.36, 0])} ` + KNOB.map((c) => `C${c.map(at).join(' ')}`).join(' ') + ` L${f1(Q.x)} ${f1(Q.y)}`;
};
// knob directions inside the 3x2 puzzle (fixed, so every puzzle in the story matches)
const vSign = (c: number, r: number) => ((c + r) % 2 ? 1 : -1); // vertical edge left of column c: +1 = knob to the right
const hSign = (c: number, r: number) => ((c + 2 * r) % 2 ? -1 : 1); // horizontal edge above row r: +1 = knob up

/** Knob directions of one cell's four edges, clockwise: +1 = knob out of the cell, -1 = into it. */
const cellSigns = (c: number, r: number, cols: number, rows: number) => ({
  t: r > 0 ? hSign(c, r) : 0,
  rt: c < cols - 1 ? -vSign(c + 1, r) : 0,
  b: r < rows - 1 ? -hSign(c, r + 1) : 0,
  l: c > 0 ? vSign(c, r) : 0,
});

/* ---- jigsaw geometry as points (for hatching and for placing the question mark) ---- */
const cubic = (a: Q2, b: Q2, c: Q2, d: Q2, n = 10): Q2[] =>
  Array.from({length: n}, (_, i) => {
    const t = (i + 1) / n;
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
  });
/** The same edge as `edge`, as points (without P). */
const edgePts = (P: Q2, Q: Q2, sgn: number): Q2[] => {
  if (!sgn) return [Q];
  const d = {x: Q.x - P.x, y: Q.y - P.y};
  const n = {x: d.y * sgn, y: -d.x * sgn};
  const at = ([u, v]: [number, number]): Q2 => ({x: P.x + d.x * u + n.x * -v, y: P.y + d.y * u + n.y * -v});
  const pts: Q2[] = [at([0.36, 0])];
  for (const c of KNOB) pts.push(...cubic(pts[pts.length - 1], at(c[0]), at(c[1]), at(c[2])));
  pts.push(Q);
  return pts;
};
/** Outline polygon of a piece with corner A (top-left) and edge signs (clockwise, + = out). */
const piecePoly = (A: Q2, S: number, sg: {t: number; rt: number; b: number; l: number}): Q2[] => {
  const B = {x: A.x + S, y: A.y};
  const Cc = {x: A.x + S, y: A.y + S};
  const D = {x: A.x, y: A.y + S};
  return [A, ...edgePts(A, B, sg.t), ...edgePts(B, Cc, sg.rt), ...edgePts(Cc, D, sg.b), ...edgePts(D, A, sg.l).slice(0, -1)];
};
const inside = (p: Q2, poly: Q2[]) => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) r = !r;
  }
  return r;
};
const segDist = (p: Q2, a: Q2, b: Q2) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
/** Where a mark sits visually centred in a shape that knobs bite into: the point with the most
 *  room around it (largest circle that fits), pulled towards `towards` (e.g. the cell's middle)
 *  so it does not drift into a corner. */
const openCentre = (poly: Q2[], towards?: Q2, pull = 0.7): Q2 => {
  const xs = poly.map((q) => q.x);
  const ys = poly.map((q) => q.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best = {x: (x0 + x1) / 2, y: (y0 + y1) / 2};
  let bestD = -Infinity;
  for (let i = 0; i <= 60; i++)
    for (let j = 0; j <= 60; j++) {
      const p = {x: x0 + ((x1 - x0) * i) / 60, y: y0 + ((y1 - y0) * j) / 60};
      if (!inside(p, poly)) continue;
      let d = Infinity;
      for (let k = 0; k < poly.length; k++) d = Math.min(d, segDist(p, poly[k], poly[(k + 1) % poly.length]));
      const score = towards ? d - pull * Math.hypot(p.x - towards.x, p.y - towards.y) : d;
      if (score > bestD) {
        bestD = score;
        best = p;
      }
    }
  return best;
};
/** Pencil hatching inside a shape: diagonal strokes cut exactly at the outline, so the pencil
 *  only travels lines that are visible. */
const hatchIn = (poly: Q2[], step: number): string => {
  const xs = poly.map((q) => q.x);
  const ys = poly.map((q) => q.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const h = y1 - y0;
  let d = '';
  for (let k = step / 2; k < x1 - x0 + h; k += step) {
    // the line from (x0 + k, y0) going down-left to (x0 + k - h, y1), as p(t) = A + t (B - A)
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
      const a = ts[i];
      const b = ts[i + 1];
      if ((b - a) * h < 4) continue;
      d += `M${f1(A.x + (B.x - A.x) * a)} ${f1(A.y + (B.y - A.y) * a)} L${f1(A.x + (B.x - A.x) * b)} ${f1(A.y + (B.y - A.y) * b)} `;
    }
  }
  return d;
};
/** Where a mark of size w x h sits best inside a shape that knobs bite into: the position where
 *  the whole box of the mark keeps the most room to the outline, nudged towards `towards`. */
const placeMark = (poly: Q2[], w: number, h: number, towards: Q2): Q2 => {
  const xs = poly.map((q) => q.x);
  const ys = poly.map((q) => q.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const box = (c: Q2): Q2[] => [-0.5, 0, 0.5].flatMap((u) => [-0.5, 0, 0.5].map((v) => ({x: c.x + u * w, y: c.y + v * h})));
  let best = towards;
  let bestScore = -Infinity;
  for (let i = 0; i <= 50; i++)
    for (let j = 0; j <= 50; j++) {
      const c = {x: x0 + ((x1 - x0) * i) / 50, y: y0 + ((y1 - y0) * j) / 50};
      const pts = box(c);
      if (!pts.every((q) => inside(q, poly))) continue;
      let room = Infinity;
      for (const q of pts) for (let k = 0; k < poly.length; k++) room = Math.min(room, segDist(q, poly[k], poly[(k + 1) % poly.length]));
      const score = room - 0.25 * Math.hypot(c.x - towards.x, c.y - towards.y);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
  return best;
};
const polyPath = (poly: Q2[]) => `M${poly.map((q) => `${f1(q.x)} ${f1(q.y)}`).join(' L')} Z`;

/** A hand-drawn question mark centred (by its ink) on (x, y), `h` tall. */
const qmark = (x: number, y: number, h: number, color = RED): DrawItem[] => {
  const s = h / 1.02; // the mark spans y -0.56..0.46 and x -0.27..0.29 in its own units
  const at = {x: x - 0.01 * s, y: y + 0.05 * s, s};
  return [
    {d: place('M-0.27 -0.3 C-0.27 -0.6 0.29 -0.66 0.29 -0.33 C0.29 -0.1 0.02 -0.1 0.02 0.16', at), color, w: Math.max(6, h * 0.075), speed: 60},
    {d: place(circ(0.02, 0.38, 0.06), at), color, fill: color, w: Math.max(5, h * 0.06), speed: 60},
  ];
};

/** One loose jigsaw piece centred at (x, y), turned by rot: outline plus light hatching inside. */
export const loosePiece = (x: number, y: number, S: number, rot: number, color = RED): DrawItem[] => {
  const local = piecePoly({x: -S / 2, y: -S / 2}, S, {t: 1, rt: 1, b: -1, l: -1});
  const c = Math.cos((rot * Math.PI) / 180);
  const sn = Math.sin((rot * Math.PI) / 180);
  const poly = local.map((q) => ({x: x + q.x * c - q.y * sn, y: y + q.x * sn + q.y * c}));
  return [
    {d: polyPath(poly), color, fill: PAPER, w: 6, speed: 90},
    {d: hatchIn(poly, 13), clip: polyPath(poly), color, w: 3, opacity: 0.45, speed: 300},
  ];
};

/** A 3x2 jigsaw (top-left x, y, cell S). `gap`: the cell left empty (a hatched hole in the shape of
 *  the missing piece, with a red question mark); `redCell`: the missing piece fitted in, in red;
 *  `heartIn`: a red heart on that cell. */
export const puzzle = (x: number, y: number, S: number, gap: number | null, opts: {heartIn?: number; redCell?: number} = {}): DrawItem[] => {
  const cols = 3;
  const rows = 2;
  const cellPoly = (k: number) => piecePoly({x: x + (k % cols) * S, y: y + Math.floor(k / cols) * S}, S, cellSigns(k % cols, Math.floor(k / cols), cols, rows));
  const out: DrawItem[] = [{d: rr(x, y, cols * S, rows * S, 6), w: 6, fill: PAPER, speed: 160}];
  for (let c = 1; c < cols; c++) {
    let d = `M${f1(x + c * S)} ${f1(y)}`;
    for (let r = 0; r < rows; r++) d += ' ' + edge({x: x + c * S, y: y + r * S}, {x: x + c * S, y: y + (r + 1) * S}, -vSign(c, r));
    out.push({d, w: 5, speed: 110});
  }
  for (let r = 1; r < rows; r++) {
    let d = `M${f1(x)} ${f1(y + r * S)}`;
    for (let c = 0; c < cols; c++) d += ' ' + edge({x: x + c * S, y: y + r * S}, {x: x + (c + 1) * S, y: y + r * S}, hSign(c, r));
    out.push({d, w: 5, speed: 110});
  }
  if (gap !== null) {
    // the hole: light pencil hatching inside the exact shape of the missing piece, and a question
    // mark at its most open point
    const poly = cellPoly(gap);
    out.push({d: hatchIn(poly, 15), clip: polyPath(poly), color: INK, w: 3, opacity: 0.22, speed: 300});
    const mh = S * 0.44;
    const o = placeMark(poly, mh * 0.56, mh, {x: x + ((gap % cols) + 0.5) * S, y: y + (Math.floor(gap / cols) + 0.5) * S});
    out.push(...qmark(o.x, o.y, mh));
  }
  if (opts.redCell !== undefined) {
    const poly = cellPoly(opts.redCell);
    out.push({d: polyPath(poly), color: RED, fill: PAPER, w: 6, speed: 90});
    out.push({d: hatchIn(poly, 13), clip: polyPath(poly), color: RED, w: 3, opacity: 0.4, speed: 300});
  }
  if (opts.heartIn !== undefined) {
    const o = openCentre(cellPoly(opts.heartIn));
    out.push(heart(o.x, o.y - S * 0.12, S / 70));
  }
  return out;
};

/* ---- sticky note: the shared pinned note (src/pencil/notes.ts) ---- */
const sticky = (x: number, y: number, lines: string[], o: Omit<NoteOpts, 'style'> = {}): DrawItem[] => note(x, y, lines, {...o, style: 'pin'});

/** Speech bubble (top-left x, y) with its tail pointing at (tx, ty) and lines of text inside. */
const bubble = (x: number, y: number, w: number, h: number, tx: number, ty: number, lines: [string, number, string?][]): DrawItem[] => {
  // corner radius and tail width follow the bubble's size; the tail leaves the straight part of
  // the bottom edge, as close to its target as it can
  const r = Math.min(38, h / 2.6);
  const tw = Math.min(54, w * 0.22);
  const bx = Math.min(x + w - r - tw, Math.max(x + r, tx - tw / 2));
  const out: DrawItem[] = [
    {d: rr(x, y, w, h, r), color: INK, w: 5.5, fill: PAPER, speed: 150},
    {d: `M${bx} ${y + h - 6} L${tx} ${ty} L${bx + tw} ${y + h - 6}`, color: INK, w: 5.5, fill: PAPER, speed: 90},
  ];
  const total = lines.reduce((s, [, size]) => s + size * 1.05, 0);
  let ly = y + (h - total) / 2;
  for (const [text, size, color] of lines) {
    ly += size * 1.05;
    out.push(C(text, x + w / 2, ly - size * 0.22, size, color ?? INK));
  }
  return out;
};

const washer = (x: number, y: number, s = 1): DrawItem[] => [
  {d: place(rr(-120, -300, 240, 300, 16), {x, y, s}), fill: PAPER},
  {d: place('M-120 -244 L120 -244', {x, y, s}), w: 4.5},
  {d: place(`${circ(-80, -272, 9)} ${circ(-50, -272, 9)} ${rr(30, -282, 64, 18, 6)}`, {x, y, s}), w: 4},
  {d: place(circ(0, -126, 84), {x, y, s}), w: 6},
  {d: place(circ(0, -126, 62), {x, y, s}), w: 4, fill: '#eef3f8'},
  {d: place('M-36 -110 Q-10 -140 20 -112 Q40 -96 30 -80', {x, y, s}), w: 3.5, opacity: 0.6},
];

const basket = (x: number, y: number, s = 1): DrawItem[] => [
  // clothes spilling over the rim
  {d: place('M-120 -150 C-110 -200 -50 -210 -30 -170 C-10 -220 70 -210 80 -165 C110 -190 140 -170 128 -150', {x, y, s}), w: 5, fill: '#f6efe0'},
  {d: place('M-150 -150 L150 -150 L118 0 L-118 0 Z', {x, y, s}), fill: PAPER},
  {d: place('M-142 -110 L142 -110 M-133 -70 L133 -70 M-125 -32 L125 -32', {x, y, s}), w: 3.5, opacity: 0.7},
  {d: place(`${rr(-150, -158, 300, 16, 8)}`, {x, y, s}), w: 5, fill: PAPER},
];

/** Folded towels: a neat stack, or a lopsided one. */
const towels = (x: number, y: number, neat: boolean, s = 1): DrawItem[] =>
  [0, 1, 2, 3].map((k) => {
    const dx = neat ? 0 : [0, 14, -18, 10][k];
    const rot = neat ? 0 : [0, 4, -5, 3][k];
    const w = neat ? 200 : [210, 190, 220, 180][k];
    return {d: place(rr(-w / 2, -44, w, 44, 10), {x: x + dx * s, y: y - k * 46 * s, s, rot}), fill: k % 2 ? '#f4e2df' : '#e4edf5', w: 5, speed: 140};
  });

/** Alarm clock: face with hands, two bells and little feet. */
const alarm = (x: number, y: number, s: number, h: number, m: number): DrawItem[] => {
  const R = 44;
  const at = {x, y, s};
  // a point on a circle of radius r at clock angle a (degrees, 0 = 12 o'clock)
  const pt = (a: number, r: number) => `${f1(Math.sin((a * Math.PI) / 180) * r)} ${f1(-Math.cos((a * Math.PI) / 180) * r)}`;
  const bell = (a: number) => place('M-17 2 C-17 -22 17 -22 17 2 Z M0 -18 L0 -24', {x: Math.sin((a * Math.PI) / 180) * (R + 2), y: -Math.cos((a * Math.PI) / 180) * (R + 2), rot: a});
  const ticks = [0, 90, 180, 270].map((a) => `M${pt(a, R - 12)} L${pt(a, R - 5)}`).join(' ');
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  return [
    // bells sitting on the rim, the hammer between them
    {d: place(`${bell(-42)} ${bell(42)}`, at), fill: PAPER, w: 5},
    {d: place(`M0 ${-R} L0 ${-R - 10} ${circ(0, -R - 15, 5)}`, at), w: 4.5},
    // feet
    {d: place(`M${pt(-145, R - 2)} L${pt(-150, R + 20)} M${pt(145, R - 2)} L${pt(150, R + 20)}`, at), w: 5},
    // case and face
    {d: place(circ(0, 0, R), at), fill: PAPER, w: 6},
    {d: place(ticks, at), w: 3.5},
    // hands: short and thick for the hour, long and thin for the minutes, on a centre pin
    {d: place(`M0 0 L${pt(ha, 20)}`, at), w: 7.5},
    {d: place(`M0 0 L${pt(ma, 32)}`, at), w: 4},
    {d: place(circ(0, 0, 4), at), fill: INK, w: 3},
    marks(x + 72 * s, y - 56 * s, 0.9, RED),
  ];
};

/** Window at night with the moon inside its top-right pane (the placement tuned in the layoff
 *  film at window scale 0.8, scaled with the window). */
const nightWindow = (x: number, y: number, ws: number): DrawItem[] => [
  ...windowFrame({x, y, s: ws}),
  moon(x + 52.5 * ws, y - 120 * ws, 0.775 * ws),
];

/** The dentist's sign: a friendly molar with a shine, a smile and sparkles (centre x, y). */
const tooth = (x: number, y: number, s = 1): DrawItem[] => {
  const at = {x, y, s};
  const star = (sx: number, sy: number, r: number) =>
    place(`M0 ${-r} Q${r * 0.18} ${-r * 0.18} ${r} 0 Q${r * 0.18} ${r * 0.18} 0 ${r} Q${-r * 0.18} ${r * 0.18} ${-r} 0 Q${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`, {x: sx, y: sy});
  return [
    // crown with two soft bumps, two roots with a rounded notch between them
    {d: place('M-58 -46 C-58 -78 -30 -86 -14 -72 C-6 -66 6 -66 14 -72 C30 -86 58 -78 58 -46 C58 -14 50 8 44 34 C38 62 34 84 22 84 C8 84 10 50 0 50 C-10 50 -8 84 -22 84 C-34 84 -38 62 -44 34 C-50 8 -58 -14 -58 -46 Z', at), fill: PAPER, w: 6, speed: 90},
    // shine on the crown
    {d: place('M-40 -48 C-40 -62 -30 -68 -22 -64', at), w: 4.5, speed: 60},
    // a little face: closed happy eyes and a smile
    {d: place('M-24 -26 Q-18 -32 -12 -26 M12 -26 Q18 -32 24 -26 M-14 -6 Q0 6 14 -6', at), w: 4.5, speed: 60},
    {d: place(`${star(74, -70, 14)} ${star(-76, -10, 9)} ${star(62, 30, 8)}`, at), color: AMBER, fill: AMBER, w: 3, speed: 90},
  ];
};

/** Kitchen stove with a pot of something new on it (base centre x, ground). */
const stove = (x: number, G: number): DrawItem[] => [
  {d: rr(x - 150, G - 250, 300, 250, 10), fill: PAPER, w: 6},
  {d: `M${x - 150} ${G - 200} L${x + 150} ${G - 200}`, w: 5},
  {d: `${circ(x - 100, G - 225, 9)} ${circ(x - 70, G - 225, 9)} ${circ(x + 70, G - 225, 9)} ${circ(x + 100, G - 225, 9)}`, w: 4},
  {d: rr(x - 110, G - 170, 220, 130, 10), w: 5},
  {d: `M${x - 70} ${G - 150} L${x + 70} ${G - 150}`, w: 5},
  // the pot, its lid and handles, and the steam
  {d: rr(x - 80, G - 340, 160, 90, 12), fill: PAPER, w: 6},
  {d: `M${x - 92} ${G - 340} L${x + 92} ${G - 340} M${x - 80} ${G - 320} L${x - 104} ${G - 320} M${x + 80} ${G - 320} L${x + 104} ${G - 320}`, w: 5},
  {d: `M${x - 12} ${G - 340} L${x - 12} ${G - 354} L${x + 12} ${G - 354} L${x + 12} ${G - 340}`, w: 4.5},
  {d: `M${x - 40} ${G - 370} Q${x - 52} ${G - 395} ${x - 40} ${G - 420} M${x} ${G - 372} Q${x - 12} ${G - 400} ${x} ${G - 428} M${x + 40} ${G - 370} Q${x + 28} ${G - 395} ${x + 40} ${G - 420}`, w: 4, opacity: 0.6, speed: 80},
];

/** A thought bubble (top-left x, y) rising from (fx, fy): a rounded cloud and three small circles. */
const thought = (x: number, y: number, w: number, h: number, fx: number, fy: number, lines: [string, number, string?][]): DrawItem[] => {
  const bx = x + w * 0.7;
  const by = y + h;
  const out: DrawItem[] = [
    {d: rr(x, y, w, h, h / 2.2), fill: PAPER, w: 5.5, speed: 150},
    ...[0.25, 0.55, 0.82].map((t, i): DrawItem => ({d: circ(bx + (fx - bx) * t, by + (fy - by) * t, 14 - i * 4), fill: PAPER, w: 4.5, speed: 80})),
  ];
  const total = lines.reduce((acc, [, size]) => acc + size * 1.05, 0);
  let ly = y + (h - total) / 2;
  for (const [text, size, color] of lines) {
    ly += size * 1.05;
    out.push(C(text, x + w / 2, ly - size * 0.22, size, color ?? INK));
  }
  return out;
};

/** Dinner on the table top (y = top): the new dish steaming in the middle, a plate with food in
 *  front of each of them, a glass and a bowl of salad. */
const dinnerTable = (top: number): DrawItem[] => {
  const servedPlate = (x: number): DrawItem[] => [
    {d: `M${x - 52} ${top} Q${x} ${top - 22} ${x + 52} ${top}`, fill: PAPER, w: 5, speed: 120},
    {d: `M${x - 26} ${top - 9} Q${x - 10} ${top - 34} ${x + 6} ${top - 14} Q${x + 18} ${top - 30} ${x + 30} ${top - 9}`, fill: '#f4e2df', w: 4, speed: 120},
    {d: `M${x + 62} ${top} L${x + 62} ${top - 30} M${x + 56} ${top - 30} L${x + 56} ${top - 44} M${x + 62} ${top - 30} L${x + 62} ${top - 44} M${x + 68} ${top - 30} L${x + 68} ${top - 44}`, w: 3.5, speed: 120},
  ];
  return [
    ...servedPlate(330),
    ...servedPlate(580),
    // the new recipe in a casserole dish, still steaming
    {d: rr(410, top - 46, 90, 46, 10), fill: '#fbf0c4', w: 5, speed: 120},
    {d: `M402 ${top - 40} L410 ${top - 40} M500 ${top - 40} L508 ${top - 40}`, w: 5, speed: 120},
    {d: `M432 ${top - 58} Q424 ${top - 74} 432 ${top - 90} M455 ${top - 60} Q447 ${top - 78} 455 ${top - 96} M478 ${top - 58} Q470 ${top - 74} 478 ${top - 90}`, w: 3.5, opacity: 0.55, speed: 90},
    // a glass of water and a bowl of salad
    {d: `M222 ${top} L218 ${top - 46} L246 ${top - 46} L242 ${top} Z M220 ${top - 30} L244 ${top - 30}`, fill: '#eef3f8', w: 4, speed: 120},
    // salad: leaves and a tomato heaped above a round bowl with a rim and a foot
    {d: `M650 ${top - 34} C644 ${top - 58} 664 ${top - 64} 670 ${top - 44} C676 ${top - 66} 698 ${top - 60} 694 ${top - 34} Z`, color: '#3f7a3a', fill: '#cfe6c4', w: 4, speed: 120},
    {d: circ(684, top - 46, 7), color: RED, fill: RED, w: 3, speed: 80},
    {d: `M638 ${top - 36} L706 ${top - 36} Q702 ${top - 6} 672 ${top - 6} Q642 ${top - 6} 638 ${top - 36} Z M662 ${top - 6} L660 ${top} L684 ${top} L682 ${top - 6}`, fill: PAPER, w: 4.5, speed: 120},
  ];
};


/** where the 'stop' pose's raised mitten sits (figure at 690, 465, size 0.52): the hand point
 *  plus half a mitten along the forearm */
const STOP_HAND = {x: 690 - 134 * 0.52 - 3, y: 465 - 238 * 0.52 - 2};
/** optical centring of the white STOP lettering inside the octagon (in sign radii) */
const STOP_DX = -0.08; // the handwriting leans right
const STOP_DY = 0.22;
/** A hand-held STOP sign: a stick rising from the hand at (hx, hy), a red octagon of radius r. */
const stopSign = (hx: number, hy: number, r: number): DrawItem[] => {
  const cy = hy - 30 - r;
  const oct = Array.from({length: 8}, (_, k) => {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    return `${k ? 'L' : 'M'}${(hx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ') + ' Z';
  return [
    {d: `M${hx} ${hy + 18} L${hx} ${cy + r - 2}`, w: 4.5, speed: 80},
    {d: oct, color: INK, fill: RED, w: 3.5, speed: 90},
    C('STOP', hx + STOP_DX * r, cy + STOP_DY * r, r * 0.62, PAPER),
  ];
};

/** A toppling pile of school books on the table top (centre x, table top y): leaning, sliding,
 *  one falling off the edge, loose worksheets underneath. */
const bookPile = (x: number, top: number): DrawItem[] => {
  const book = (cx: number, by: number, w: number, h: number, rot: number, tint: string): DrawItem[] => [
    {d: place(rr(-w / 2, -h, w, h, 4), {x: cx, y: by, rot}), fill: tint, w: 4.5, speed: 160},
    {d: place(`M${-w / 2 + 8} ${-h + 5} L${-w / 2 + 8} -5`, {x: cx, y: by, rot}), w: 3, opacity: 0.6, speed: 160},
  ];
  return [
    // loose worksheets fanned out under the pile
    {d: place('M-120 0 L-118 -6 L-20 -8 L-18 0 Z', {x, y: top}), fill: PAPER, w: 3.5, speed: 200},
    {d: place('M10 0 L14 -7 L118 -2 L112 0 Z', {x, y: top}), fill: PAPER, w: 3.5, speed: 200},
    ...book(x - 6, top, 150, 22, 0, '#e4edf5'),
    ...book(x + 4, top - 22, 140, 20, -2, '#f4e2df'),
    ...book(x - 10, top - 43, 132, 24, 3, '#fbf0c4'),
    ...book(x + 12, top - 67, 120, 18, -5, '#e4edf5'),
    ...book(x - 4, top - 86, 110, 22, 7, '#f4e2df'),
    // the top one tipping over the edge of the pile, with motion marks on the free side
    ...book(x + 30, top - 108, 96, 18, 24, '#fbf0c4'),
    {d: place('M6 -6 Q14 -16 8 -26 M-8 -10 Q-2 -22 -10 -30', {x: x - 70, y: top - 118}), w: 3.5, opacity: 0.7, speed: 80},
  ];
};

const floor = (x0: number, x1: number, y: number): DrawItem => ({d: `M${x0} ${y} L${x1} ${y}`, w: 5.5, speed: 160});

const arrow = (x0: number, y0: number, x1: number, y1: number, color = RED): DrawItem[] => {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const mx = (x0 + x1) / 2 - Math.sin(a) * 40;
  const my = (y0 + y1) / 2 + Math.cos(a) * 40;
  // the head follows the direction the curve arrives in (from the control point), not the chord
  const e = Math.atan2(y1 - my, x1 - mx);
  const h = (da: number) => `${f1(x1 - Math.cos(e + da) * 30)} ${f1(y1 - Math.sin(e + da) * 30)}`;
  return [{d: `M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`, color, w: 6}, {d: `M${h(0.5)} L${x1} ${y1} L${h(-0.5)}`, color, w: 6}];
};

/** A deterministic tangled scribble (the overwhelmed mind). */
const scribble = (cx: number, cy: number, rx: number, ry: number, n = 420): string => {
  let d = '';
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * Math.PI * 2 * 3;
    const x = cx + rx * (0.7 * Math.sin(1.3 * t) + 0.3 * Math.sin(7.1 * t));
    const y = cy + ry * (0.7 * Math.cos(1.7 * t) + 0.3 * Math.sin(5.3 * t + 1));
    d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
};

export const mom = (x: number, y: number, o: Partial<Parameters<typeof stick>[0]> = {}) => stick({x, y, hair: 'long', skirt: true, mood: 'neutral', ink: 1, ...o});
const girl = (x: number, y: number, o: Partial<Parameters<typeof stick>[0]> = {}) => stick({x, y, child: true, hair: 'pigtails', skirt: true, mood: 'neutral', ink: 1, ...o});
const dad = (x: number, y: number, o: Partial<Parameters<typeof stick>[0]> = {}) => stick({x, y, mood: 'smile', ink: 1, ...o});

/** Mother at her desk, seen from the front behind the laptop. */
const deskScene = (x: number, ground: number, mood: 'smile' | 'determined' | 'neutral'): DrawItem[] => [
  floor(60, 880, ground),
  ...seatedAtDesk({x, ground, person: {hair: 'long', mood}}),
  ...mug({x: x + 190, y: ground - DESK_TOP}),
];

/** Kitchen table with mother and daughter behind it (table top drawn last so it hides the bodies). */
/**
 * Someone sitting on a kitchen chair behind a table, seen from the front, in real proportions
 * (for a standing figure ~330 tall: table top ~140 above the floor, adult seat ~90): the hips rest
 * on the seat, the body goes up behind the table top (drawn afterwards, hiding what is behind it),
 * and the shins go down from the seat to the floor, or dangle when the seat is high (a child).
 * `k` = the figure's overall scale (adult 1; the daughter 0.58 child x her own size).
 */
const kitchenSeat = (px: number, G: number, seatH: number, k: number, person?: (personY: number) => DrawItem[]): DrawItem[] => {
  const limbW = 6.5; // the family is drawn with one pen (ink: 1), legs included
  const seatY = G - seatH;
  const personY = seatY + 140 * k; // the atDesk pose has its hip 140 above personY
  const footY = Math.min(G - 9 * k, seatY + 112 * k);
  const shoe = 'M-6 -7 C-6 -16 22 -16 32 -5 C34 2 28 6 -6 6 Z';
  const sw = Math.max(52, 74 * k); // seat half width
  return [
    // the chair: four legs, the seat
    {d: `M${px - sw + 8} ${seatY + 12} L${px - sw + 2} ${G} M${px + sw - 8} ${seatY + 12} L${px + sw - 2} ${G}`, w: 5.5},
    {d: rr(px - sw, seatY - 4, 2 * sw, 16, 7), fill: PAPER, w: 5.5},
    // the person, hips on the seat (the table top hides the middle)
    ...(person ? person(personY) : []),
    // shins from the front edge of the seat down, and shoes (only when someone sits there)
    ...(!person ? [] : [{d: `M${px - 14 * k} ${seatY + 6} L${px - 20 * k} ${footY} M${px + 14 * k} ${seatY + 6} L${px + 20 * k} ${footY}`, w: limbW},
    {d: `${place(shoe, {x: px - 20 * k, y: footY + 3, s: Math.max(0.7, k), flip: true})} ${place(shoe, {x: px + 20 * k, y: footY + 3, s: Math.max(0.7, k)})}`, fill: PAPER, w: 4.5}] as DrawItem[]),
  ];
};

/** Kitchen table with mother and daughter on chairs behind it (the table top hides their bodies). */
const homeworkTable = (ground: number): DrawItem[] => {
  const top = ground - 140;
  const girlScale = 0.58 * 1.25;
  return [
    floor(60, 880, ground),
    ...kitchenSeat(300, ground, 90, 1, (py) => mom(300, py, {pose: 'atDesk', mood: 'worried', skirt: false})),
    // the daughter on a taller chair: her head at the table like her mother's, feet off the floor
    ...kitchenSeat(600, ground, 118, girlScale, (py) => girl(600, py, {pose: 'atDesk', mood: 'sad', s: 1.25, skirt: false})),
    {d: rr(110, top, 720, 26, 8), fill: PAPER, w: 6},
    {d: `M150 ${top + 26} L150 ${ground} M790 ${top + 26} L790 ${ground}`, w: 6},
    ...bookPile(455, top),
  ];
};

/* ----------------------------------- the book ----------------------------------- */

export const SPREADS = 11;
const DAD_X = 410; // the father on the last page (the family stands around him)
const FAST = 16;
/** the narrated lines on the 'you never...' page, by line index */
const PILE2_MARKS: Record<number, string> = {0: 'pile2', 1: 'pile2b', 2: 'pile2c', 7: 'pile2d'};

export const STEPS: Step[] = [
  // 0 — title + hook
  {id: 'hook', spread: 0, pause: 20, hold: 50, right: [
    T('She does everything.', R0, R(6), 84, INK, {mark: 'open1'}),
    T("It's never enough.", R0, R(8), 96, RED, {mark: 'open2'}),
  ]},
  {id: 'title', spread: 0, hold: 40, left: [
    C('The Missing', 470, R(3), 124),
    C('Piece.', 470, R(5) + 10, 170, RED),
    {d: 'M300 482 C400 506 560 500 660 470 C620 492 600 500 590 512', color: RED, w: 7, speed: 140},
    // the family puzzle with its one empty place...
    ...puzzle(150, 650, 140, 2),
    // ...and her, reaching up with the red piece she keeps trying to be
    ...mom(790, 1130, {pose: 'cheer', mood: 'determined'}),
    ...loosePiece(790, 740, 104, -8),
    marks(880, 700, 0.9, RED),
    ...arrow(718, 700, 592, 712),
    floor(130, 900, 1130),
  ]},

  // 1 — morning
  {id: 'morning', spread: 1, hold: 20, left: [
    ...mk('morning', alarm(270, 300, 1.7, 6, 0)),
    T('6:00', 420, 336, 120),
    T('Every morning.', L0, R(7), 70),
    ...mom(330, 1130, {pose: 'stand', mood: 'neutral'}),
    ...mug({x: 410, y: 1030, s: 0.9, flip: true}),
    floor(160, 860, 1130),
    T('Before anyone', 520, R(11), 56, INK, {mark: 'morning2'}), T('else is awake.', 520, R(12), 56),
  ]},
  {id: 'list', spread: 1, hold: 30, speed: 1.2, right: [
    T('TODAY:', R0 + 20, R(2), 84, INK, {mark: 'list'}),
    ...['lunchboxes', 'project — due FRIDAY', 'dentist, 4 pm', 'maths homework', 'dinner, 7 pm', 'laundry', 'milk!!'].flatMap((txt, k) => [
      {d: rr(R0 + 24, R(4 + k) - 40, 38, 38, 6), w: 4.5, speed: 120} as DrawItem,
      T(txt, R0 + 92, R(4 + k), 58),
    ]),
  ]},
  {id: 'ticks', spread: 1, hold: 40, speed: 1.6, right: [
    ...[0, 1, 2, 3, 4, 5].map((k) => check(R0 + 47, R(4 + k) - 27, 1.5)),
    T('Every box. Every day.', R0 + 20, R(13), 64, RED, {mark: 'ticks'}),
  ]},

  // 2 — work
  {id: 'work', spread: 2, hold: 30, left: [
    T('9:00 — work.', L0, R(2), 76, INK, {mark: 'work'}),
    ...sticky(690, 370, ['PROJECT', 'DONE'], {w: 250, h: 200, rot: -4, size: 46}),
    check(772, 386, 1.3),
    ...deskScene(400, R(12), 'determined'),
    T('She delivered the project.', L0, R(14), 60, INK, {mark: 'work2'}),
    T('On time. Every piece.', L0, R(15), 60),
  ]},
  {id: 'complaint', spread: 2, hold: 55, right: [
    ...puzzle(260, 250, 150, 5),
    ...mk('complaint', bubble(R0 + 10, 690, 560, 170, 760, 930, [['"You missed a part."', 58, RED]])),
    ...stick({x: 790, y: 1200, s: 0.82, mood: 'determined', tie: true, tieColor: INK, hair: 'side', glasses: true, ink: 1}),
    ...mom(300, 1200, {s: 0.82, mood: 'sad'}),
    floor(R0, 940, 1200),
  ]},

  // 3 — the dentist, squeezed in between two meetings
  {id: 'dentist', spread: 3, hold: 30, left: [
    T('4 pm — dentist.', L0, R(2), 76, INK, {mark: 'dentist'}),
    ...clock(720, 300, 1.3, 4, 0),
    ...kitchenSeat(280, 1000, 90, 1, (py) => mom(280, py, {pose: 'atDesk', mood: 'determined', skirt: false})),
    ...laptopBack({x: 280, y: 922, s: 0.48}),
    // the empty chair: her daughter is already in with the dentist (right page)
    ...kitchenSeat(560, 1000, 90, 1),
    floor(60, 880, 1000),
    T('Laptop on her knees.', L0, R(15), 60, INK, {mark: 'dentist2'}),
    T('Still answering emails.', L0, R(16), 60),
  ]},
  {id: 'checkup', spread: 3, hold: 45, right: [
    ...tooth(300, 330, 1.5),
    ...girl(380, 1050, {s: 1.3, pose: 'reachUp', flip: true, mood: 'grin'}),
    ...stick({x: 720, y: 1050, mood: 'smile', hair: 'none', glasses: true, coat: true, ink: 1}),
    ...mk('checkup', bubble(470, 420, 420, 170, 705, 712, [['See you in', 50], ['6 months!', 58, RED]])),
    floor(R0, 940, 1050),
    T('One more date to remember.', R0 + 20, R(16), 58, INK, {mark: 'checkup2'}),
  ]},

  // 4 — the daughter
  {id: 'homework', spread: 4, hold: 25, left: [
    T('6 pm — homework.', L0, R(2), 76, INK, {mark: 'homework'}),
    C('3/4 + 1/8 = ?', 470, R(5), 70),
    ...homeworkTable(1060),
    T('Fractions. Spelling.', L0, R(15), 60, INK, {mark: 'homework2'}),
    T('One more page.', L0, R(16), 60),
  ]},
  {id: 'argue', spread: 4, hold: 55, right: [
    ...bubble(380, 480, 520, 220, 650, 790, [['NO!', 96, RED], ["You're WRONG!", 64, RED]]),
    ...girl(650, 1080, {s: 1.3, pose: 'akimbo', mood: 'determined'}),
    marks(555, 850, 1, RED),
    ...mom(300, 1080, {s: 1, mood: 'worried'}),
    floor(R0, 940, 1080),
    T('Every. Single. Night.', R0 + 40, R(15), 64, INK, {mark: 'argue'}),
  ]},

  // 5 — dinner
  {id: 'cook', spread: 5, hold: 25, left: [
    T('7 pm — dinner.', L0, R(2), 76, INK, {mark: 'cook'}),
    ...mom(300, 1000, {pose: 'stand', mood: 'determined'}),
    ...stove(620, 1000),
    floor(60, 880, 1000),
    T('A new recipe tonight.', L0, R(15), 60, INK, {mark: 'cook2'}),
  ]},
  {id: 'just-ok', spread: 5, hold: 55, right: [
    ...kitchenSeat(330, 1000, 90, 1, (py) => dad(330, py, {pose: 'atDesk', mood: 'neutral'})),
    ...kitchenSeat(580, 1000, 118, 0.58 * 1.25, (py) => girl(580, py, {pose: 'atDesk', mood: 'neutral', s: 1.25, skirt: false})),
    {d: rr(180, 860, 540, 26, 8), fill: PAPER, w: 6},
    {d: 'M220 886 L220 1000 M680 886 L680 1000', w: 6},
    ...dinnerTable(860),
    ...mom(830, 1000, {mood: 'sad'}),
    ...mk('just-ok', bubble(170, 520, 300, 120, 320, 700, [["It's... OK.", 56]])),
    ...mk('just-ok2', thought(150, 250, 440, 190, 800, 640, [['Everything I cook', 50], ['tastes bad.', 56, RED]])),
    floor(R0, 940, 1000),
    T('Just... OK.', R0 + 40, R(16), 62),
  ]},

  // 6 — the husband
  {id: 'laundry', spread: 6, hold: 25, left: [
    T('Saturday — laundry.', L0, R(2), 76, INK, {mark: 'laundry'}),
    ...basket(300, 720),
    ...towels(640, 720, true),
    floor(120, 860, 720),
    T('Her rule:', L0, R(12), 62, INK, {mark: 'laundry2'}),
    T('towels in thirds.', L0, R(13), 62),
    T('Always.', L0, R(14), 62),
  ]},
  {id: 'husband', spread: 6, hold: 55, right: [
    ...mk('husband', dad(380, 1050, {pose: 'holdHands'})),
    {d: rr(296, 880, 168, 64, 10), fill: '#e4edf5', w: 5.5},
    {d: 'M296 912 L464 912', w: 3.5, opacity: 0.6},
    ...towels(610, 1050, false, 0.8),
    ...mom(820, 1050, {s: 0.85, mood: 'sad'}),
    ...mk('husband2', bubble(560, 470, 360, 170, 812, 750, [['Not like', 54], ['THAT.', 64, RED]])),
    floor(R0, 940, 1050),
    T('Even help felt wrong.', R0 + 40, R(16), 62, INK, {mark: 'husband3'}),
  ]},

  // 7-8 — the pile-up: fast pages, notes everywhere
  {id: 'pile1', spread: 7, flip: FAST, hold: 8, speed: 2.4, left: [
    ...mk('pile1', sticky(300, 300, ['Where is', 'section 4??'], {rot: -6})),
    ...mk('pile1b', sticky(620, 560, ['MOM!!!'], {rot: 5, size: 70})),
    ...mk('pile1c', sticky(320, 830, ['Did you', 'buy milk?'], {rot: 3})),
    ...mk('pile1d', sticky(640, 1080, ['Sign the', 'school form!'], {rot: -4})),
  ], right: [
    ...mk('pile1e', sticky(360, 300, ['Deadline moved:', 'TOMORROW'], {rot: 4, color: RED})),
    ...mk('pile1f', sticky(680, 580, ['Parent meeting', '6 pm'], {rot: -5})),
    ...mk('pile1g', sticky(380, 860, ['Laundry', '(again)'], {rot: -2})),
    ...mk('pile1h', sticky(680, 1090, ["Why didn't", 'you...?'], {rot: 6, color: RED})),
  ]},
  {id: 'pile2', spread: 8, flip: FAST, hold: 20, speed: 2.6, left: [
    ...['you forgot...', 'mom, you never...', 'can you just...', 'where is my...', 'why is it...', 'did you even...', 'not like that...', 'one more thing...'].map((txt, k) =>
      T(txt, L0 + (k % 2) * 90, R(2 + k * 1.5), 56, k % 3 === 2 ? RED : INK, PILE2_MARKS[k] ? {mark: PILE2_MARKS[k]} : {})),
  ], right: [
    {d: scribble(540, 640, 320, 420), color: INK, w: 4.5, speed: 260},
    {d: scribble(560, 600, 220, 300, 260), color: RED, w: 4, speed: 260},
  ]},

  // 9 — the breakdown
  {id: 'floor', spread: 9, flip: 40, pause: 30, hold: 20, right: [
    ...mk('floor', nightWindow(560, 700, 1.1)),
    ...washer(790, 1000, 0.95),
    ...mom(250, 1000, {pose: 'slump', mood: 'crushed', skirt: false, s: 1.35}),
    ...basket(610, 1000, 0.65),
    floor(R0, 940, 1000),
  ]},
  {id: 'wonder', spread: 9, hold: 100, left: [
    T('One night,', L0, R(4), 66),
    T('on the laundry-room floor,', L0, R(5), 66),
    T('she wondered', L0, R(7), 66, INK, {mark: 'wonder'}),
    T('if she was failing', L0, R(8), 66),
    T('at everything.', L0, R(9), 66),
  ]},
  {id: 'turnback', spread: 9, hold: 40, left: [
    T("But let's turn", L0, R(12), 76, RED, {mark: 'turnback'}),
    T('the pages back.', L0, R(13), 76, RED),
  ]},

  // the whole stack of read pages swings back to the start in one move...
  {id: 'back-to-start', spread: 0, jump: true, flip: 54, pause: 24, hold: 60, right: [
    // struck through from the first letter to the last (text width: 18 chars x 96 x 0.43)
    {d: `M${R0 - 8} ${R(8) - 30} C${R0 + 220} ${R(8) - 40} ${R0 + 480} ${R(8) - 22} ${R0 + 745} ${R(8) - 34}`, color: RED, w: 7},
    T('She is enough.', R0, R(10), 104, RED, {mark: 'back-to-start'}),
  ]},

  // ...and the book is read again, forward, page by page: this time with what she didn't see
  // 2 — the project, read again
  {id: 'not-hers', spread: 2, flip: 26, hold: 70, rightFirst: true, right: [
    ...arrow(720, 470, 850, 560),
    ...tinyStick(880, 660, 0.32, RED),
    T("someone else's part", 470, 640, 44, RED),
    ...mk('not-hers', sticky(445, 775, ['The missing piece', 'was never hers.'], {w: 610, h: 210, rot: -2, size: 56, color: RED})),
  ], left: [
    // a red ring around the PROJECT DONE note (centred on it: note at 690, 370, 250 x 200)
    // the original open, overshooting stroke, moved right to sit around the note
    {d: 'M605 250 C725 220 865 280 857 380 C849 480 685 500 605 470 C515 440 515 300 635 262', color: RED, w: 6},
    T('Done. Done right.', L0, R(16), 64, RED, {mark: 'not-hers2'}),
  ]},

  // 3 — the dentist, read again: the dates are not hers alone to carry
  {id: 'shared', spread: 3, flip: 26, hold: 70, left: [
    T("She doesn't have to", L0, R(5), 60, RED, {mark: 'shared'}),
    T('remember everything alone.', L0, R(6), 60, RED),
  ], right: [
    ...mk('shared2', sticky(725, 255, ['Next check-up:', "Dad's turn."], {w: 360, h: 200, rot: 3, size: 50, color: RED})),
  ]},

  // 4 — the daughter, read again
  {id: 'safe', spread: 4, flip: 26, hold: 70, rightFirst: true, right: [
    ...mk('safe', sticky(370, 210, ['She argues with you', 'because she feels', 'SAFE with you.'], {w: 440, h: 230, rot: -3, size: 48, color: RED})),
  ], left: [
    ...sticky(470, 350, [], {w: 750, h: 470, rot: 2}),
    ...[230, 290, 350, 410].flatMap((x) => tinyStick(x, 465, 0.3)),
    ...bubble(560, 150, 180, 92, 706, 282, [['No.', 56, RED]]),
    // the daughter grown up: still her pigtails and dress, adult height
    // a little STOP sign on a stick, drawn first so her raised hand grips it
    ...stopSign(STOP_HAND.x, STOP_HAND.y, 22),
    ...stick({x: 690, y: 465, s: 0.52, hair: 'pigtails', skirt: true, pose: 'stop', mood: 'determined', ink: 1}),
    C('Kids who stand their ground at home', 480, 520, 37, RED, {rot: 2, pivot: {x: 470, y: 350}, mark: 'safe2'}),
    C('learn to say no out there.', 480, 560, 37, RED, {rot: 2, pivot: {x: 470, y: 350}}),
  ]},

  // 5 — dinner, read again
  {id: 'recipe', spread: 5, flip: 26, hold: 70, left: [
    ...mk('recipe', Array.from({length: 9}, (_, k) => heart(170 + k * 76, R(4) - 14, 0.9))),
    T('9 dinners before it: loved.', L0, R(6), 58, RED),
  ], right: [
    ...mk('recipe2', sticky(370, 345, ['One recipe.', 'Not you.'], {w: 520, h: 260, rot: -3, size: 62, color: RED})),
  ]},

  // 6 — the husband, read again
  {id: 'his-way', spread: 6, flip: 26, hold: 70, rightFirst: true, right: [
    ...mk('his-way', sticky(330, 390, ['Not wrong.', 'Just HIS way.'], {w: 340, h: 200, rot: -4, size: 50, color: RED})),
    heart(610, 820, 1.4),
  ], left: [
    {d: `M${L0 - 6} ${R(13) - 18} L${L0 + 410} ${R(13) - 22}`, color: RED, w: 6},
    ...mk('his-way2', sticky(470, 1130, ['He wanted to help.', 'Not to copy you.'], {w: 440, h: 190, rot: 3, size: 46, color: RED})),
  ]},

  // forward to a new page — the end
  {id: 'never', spread: 10, flip: 16, flipGap: 0, pause: 30, hold: 40, left: [
    C('She was never', 470, R(3), 90, INK, {mark: 'never'}),
    C('the missing piece.', 470, R(5), 96, RED),
    ...puzzle(245, 640, 150, null, {heartIn: 5, redCell: 5}),
  ]},
  {id: 'home', spread: 10, hold: 30, right: [
    {d: rr(700, 320, 190, 380, 6), w: 5.5},
    ...sticky(795, 440, ['Love you mom', '(even when', 'we fight)'], {w: 160, h: 150, rot: 4, size: 30}),
    ...sticky(795, 610, ['Thank you', 'for everything.', '— D'], {w: 160, h: 140, rot: -3, size: 28}),
    // the family as in the channel logo: mother and daughter in red, holding hands with him
    ...mk('home', mom(DAD_X - 160, 1000, {pose: 'holdHands', mood: 'smile', color: RED})),
    ...dad(DAD_X, 1000, {pose: 'holdFamily', mood: 'smile'}),
    ...girl(DAD_X + 70 + 86 * 0.58 * 1.3, 1000, {s: 1.3, pose: 'reachParent', mood: 'smile', color: RED}),
    heart(DAD_X - 80, 610, 1.4),
    floor(R0, 940, 1000),
  ]},
  {id: 'better', spread: 10, hold: 70, right: [
    T("You're doing better", R0 + 40, R(15), 70, INK, {mark: 'better'}),
    T('than you think.', R0 + 40, R(16), 70),
  ]},
];

/* ------------------------------ the Shorts / Reels cut ------------------------------ */
// The core of the story for a vertical feed (~1:30 with narration): the day (list, work, daughter,
// dinner), the breakdown, one swing back to the start and the same three truths, then the end.
// Same pages and lines as the full film; the book simply has fewer of them.
const SHORT_IDS = [
  'hook', 'title', 'morning', 'list', 'ticks', 'work', 'complaint', 'homework', 'argue', 'cook', 'just-ok',
  'floor', 'wonder', 'turnback', 'back-to-start', 'not-hers', 'safe', 'recipe', 'never', 'home', 'better',
];
const SHORT_SPREAD: Record<number, number> = {0: 0, 1: 1, 2: 2, 4: 3, 5: 4, 9: 5, 10: 6};
export const SHORT_SPREADS = 7;
// feed pacing: the narration still leads (the pencil waits for it), but the silent reading holds
// are short, the pencil draws faster and pages turn quicker
export const SHORT_STEPS: Step[] = STEPS.filter((s) => SHORT_IDS.includes(s.id)).map((s) => ({
  ...s,
  spread: SHORT_SPREAD[s.spread],
  hold: Math.min(s.hold ?? 45, s.id === 'better' ? 30 : 8),
  speed: (s.speed ?? 1) * 3,
  flip: s.jump ? 40 : Math.min(s.flip ?? 34, 20),
  pause: Math.min(s.pause ?? 6, 8),
}));
