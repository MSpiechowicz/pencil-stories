// "Day One. Again.": a man tries to quit the one thing he keeps going back to. A wall calendar
// counts his days; every fall tears the page out and he starts again from day one. On the night he
// rips the ninth calendar off the wall, he lays the torn pages side by side and sees that every run
// was longer than the one before: he was never starting from zero. The book goes back through his
// falls and adds what each one taught him, then riffles forward to a hundred days.
//
// Each page has its own coordinates: x 0..1000, y 0..1300 (see src/book). Handwriting sits on the
// ruled lines (R(k)). Keep drawings clear of the gutter (x < 60 on right pages, x > 940 on left
// pages): a torn-out page leaves its stub there.
// Step ids are beats; every narration line's mark is carried by the item that starts it.
import type {DrawItem} from '../../pencil/draw';
import {AMBER, INK, PAPER, RED, cloud, heart, moon, mug, windowFrame} from '../../pencil/art';
import {marks, seatedAtDesk, stick, stickHead} from '../../pencil/stick';
import {note, type NoteOpts} from '../../pencil/notes';
import {circ, ellipse, place, rr, shadeEllipse} from '../../pencil/geo';
import type {Step} from '../../book/timeline';

/** Mark the first of a group of items: the narration line with this mark starts there. */
const mk = (mark: string, items: DrawItem[]): DrawItem[] => items.map((it, k) => (k ? it : {...it, mark}));

/** baseline of ruled line k */
const R = (k: number) => 84 + 72 * k;
const T = (text: string, x: number, y: number, size = 58, color = INK, extra: Partial<DrawItem> = {}): DrawItem => ({text, x, y, size, color, ...extra});
const C = (text: string, x: number, y: number, size = 58, color = INK, extra: Partial<DrawItem> = {}): DrawItem => T(text, x, y, size, color, {center: true, ...extra});
const L0 = 120; // left page text start
const R0 = 150; // right page text start
const f1 = (n: number) => n.toFixed(1);

/* ----------------------------------- props ----------------------------------- */

const floor = (x0: number, x1: number, y: number): DrawItem => ({d: `M${x0} ${y} L${x1} ${y}`, w: 5.5, speed: 160});

/** him: one pen whatever the size, short side-swept hair */
export const man = (x: number, y: number, o: Partial<Parameters<typeof stick>[0]> = {}) => stick({x, y, hair: 'tufts', mood: 'neutral', ink: 1, ...o});
const friend = (x: number, y: number, o: Partial<Parameters<typeof stick>[0]> = {}) => stick({x, y, hair: 'none', mood: 'smile', ink: 1, ...o});

/** Tally marks: groups of four strokes crossed by a fifth, `n` in all, from (x, y) (top), h tall. */
const tally = (x: number, y: number, n: number, h = 70, color = INK, w = 6): DrawItem[] => {
  const out: DrawItem[] = [];
  const gap = h * 0.26;
  let cx = x;
  for (let g = 0; g < Math.ceil(n / 5); g++) {
    const k = Math.min(5, n - g * 5);
    let d = '';
    for (let i = 0; i < Math.min(4, k); i++) d += `M${f1(cx + i * gap)} ${y} L${f1(cx + i * gap - 3)} ${y + h} `;
    if (k === 5) d += `M${f1(cx - gap * 0.5)} ${f1(y + h * 0.72)} L${f1(cx + gap * 3.6)} ${f1(y + h * 0.22)}`;
    out.push({d, color, w, speed: 140});
    cx += gap * 4 + h * 0.42;
  }
  return out;
};

/** A red line struck through the middle of a tally (same arguments as `tally`), a little past
 *  both ends, rising slightly to the right. */
const strike = (x: number, y: number, n: number, h = 70): DrawItem => {
  const gap = h * 0.26;
  const groups = Math.ceil(n / 5);
  const last = n - (groups - 1) * 5;
  const x1 = x + (groups - 1) * (gap * 4 + h * 0.42) + gap * (last === 5 ? 3.6 : Math.min(4, last) - 1);
  const x0 = x - (n >= 5 ? gap * 0.5 : 0);
  const cx = (x0 + x1) / 2;
  const cy = y + h / 2;
  const half = (x1 - x0) / 2 + 50;
  return {d: `M${f1(cx - half)} ${f1(cy + half * 0.22)} L${f1(cx + half)} ${f1(cy - half * 0.22)}`, color: RED, w: 8};
};

/** A red line struck through the middle of a centred number (centre x, baseline y, size), a little
 *  past both ends. Handwritten digits sit low: their middle is about a quarter of the size up. */
const strikeNum = (txt: string, cx: number, y: number, size: number): DrawItem => {
  const half = txt.length * size * 0.24 + 30;
  const my = y - size * 0.2;
  return {d: `M${f1(cx - half)} ${f1(my + 10)} L${f1(cx + half)} ${f1(my - 10)}`, color: RED, w: 9};
};

/** A wall calendar (top-left x, y; w wide, `rows` weeks): two rings, the month band, a grid with a
 *  short stroke in each of the first `days` cells and a red cross in cell `cross`. */
/** days in each month this story uses (it starts on March 1st) */
const MONTH_DAYS: Record<string, number> = {MARCH: 31, APRIL: 30, MAY: 31, JUNE: 30, JULY: 31, AUGUST: 31};
/** the weekday each month starts on in 2026, Monday-first (0 = Monday): the story starts on
 *  Sunday, March 1st, and every month after it begins where the one before ended */
const MONTH_START: Record<string, number> = {MARCH: 6, APRIL: 2, MAY: 4, JUNE: 0, JULY: 2, AUGUST: 5};
export const wallCalendar = (x: number, y: number, w: number, o: {days?: number; cross?: number; month?: string; rows?: number; crosses?: number[]; strokes?: number[]; length?: number} = {}): DrawItem[] => {
  // strokes and crosses are days of the month (0 = the 1st); a cell is the day's place in the week
  const length = o.length ?? (o.month ? MONTH_DAYS[o.month] : undefined);
  const start = o.month ? MONTH_START[o.month] ?? 0 : 0;
  const rows = o.rows ?? (length ? Math.ceil((start + length) / 7) : 4);
  const cell = w / 7;
  const band = cell * 0.9;
  const h = band + rows * cell;
  const out: DrawItem[] = [
    {d: rr(x, y, w, h, 10), fill: PAPER, w: 5.5, speed: 160},
    {d: `M${x} ${y + band} L${x + w} ${y + band}`, w: 4.5},
    {d: `${rr(x + w * 0.22 - 7, y - 18, 14, 34, 6)} ${rr(x + w * 0.78 - 7, y - 18, 14, 34, 6)}`, fill: PAPER, w: 4},
  ];
  if (o.month) out.push(C(o.month, x + w / 2, y + band * 0.74, band * 0.62));
  let grid = '';
  for (let r = 1; r < rows; r++) grid += `M${x} ${f1(y + band + r * cell)} L${x + w} ${f1(y + band + r * cell)} `;
  for (let c = 1; c < 7; c++) grid += `M${f1(x + c * cell)} ${y + band} L${f1(x + c * cell)} ${y + h} `;
  if (length !== undefined) {
    let shade = '';
    for (let k = 0; k < rows * 7; k++) {
      if (k >= start && k < start + length) continue; // days before the 1st and after the last are grey
      const gx = x + (k % 7) * cell, gy = y + band + Math.floor(k / 7) * cell;
      shade += `M${f1(gx + 4)} ${f1(gy + 4)} h${f1(cell - 8)} v${f1(cell - 8)} h${f1(8 - cell)} Z `;
    }
    if (shade) out.push({d: shade, color: '#dedad1', fill: '#dedad1', w: 1, speed: 2000});
  }
  out.push({d: grid, w: 3, opacity: 0.7, speed: 260});
  const at = (day: number) => { const k = start + day; return {cx: x + (k % 7) * cell + cell / 2, cy: y + band + Math.floor(k / 7) * cell + cell / 2}; };
  let strokes = '';
  for (const k of o.strokes ?? Array.from({length: o.days ?? 0}, (_, i) => i)) {
    const {cx, cy} = at(k);
    strokes += `M${f1(cx)} ${f1(cy - cell * 0.28)} L${f1(cx - 2)} ${f1(cy + cell * 0.28)} `;
  }
  if (strokes) out.push({d: strokes, w: 5, speed: 160});
  for (const k of [...(o.crosses ?? []), ...(o.cross !== undefined ? [o.cross] : [])]) {
    const {cx, cy} = at(k);
    const s = cell * 0.3;
    out.push({d: `M${f1(cx - s)} ${f1(cy - s)} L${f1(cx + s)} ${f1(cy + s)} M${f1(cx + s)} ${f1(cy - s)} L${f1(cx - s)} ${f1(cy + s)}`, color: RED, w: 6, speed: 120});
  }
  return out;
};

/** An oval mirror on a stand (centre x, y) and his reflection in it: head, shoulders and his
 *  hands raised in front of his chest, all cut at the glass. `tired`: worried face, dark rings
 *  under the eyes, the hands trembling; otherwise a smile and still hands. */
export const mirrorCurrent = (x: number, y: number, tired: boolean): DrawItem[] => {
  const glass = ellipse(x, y, 150, 210);
  const hy = y + 120; // the hands, in front of the chest
  return [
    {d: ellipse(x, y, 170, 230), fill: '#eef3f8', w: 7, speed: 170},
    {d: glass, w: 3.5, opacity: 0.7},
    {d: `M${x - 122} ${y - 108} L${x - 98} ${y - 148} M${x - 114} ${y - 68} L${x - 86} ${y - 112}`, color: '#9fb3cc', w: 4, opacity: 0.8},
    {d: `M${x - 60} ${y + 228} L${x - 90} ${y + 300} M${x + 60} ${y + 228} L${x + 90} ${y + 300}`, w: 6},
    ...stickHead(x, y - 60, 72, {mood: tired ? 'worried' : 'smile'}),
    // shoulders, and the forearms rising from the bottom of the glass to the hands
    // shoulders: from where they meet the glass, closed along its bottom edge, filled like his body
    {d: `M${x - 105} ${y + 150} C${x - 92} ${y + 70} ${x - 45} ${y + 40} ${x} ${y + 40} C${x + 45} ${y + 40} ${x + 92} ${y + 70} ${x + 105} ${y + 150} A150 210 0 0 1 ${x - 105} ${y + 150} Z`, w: 6, fill: PAPER},
    {d: `M${x - 55} ${y + 192} L${x - 44} ${hy + 18} M${x + 55} ${y + 192} L${x + 44} ${hy + 18}`, w: 6},
    {d: `${circ(x - 42, hy, 20)} ${circ(x + 42, hy, 20)}`, fill: PAPER, w: 5},
    ...(tired
      ? [{d: `M${x - 84} ${hy - 16} q-8 8 0 16 M${x - 96} ${hy - 22} q-10 12 0 28 M${x + 84} ${hy - 16} q8 8 0 16 M${x + 96} ${hy - 22} q10 12 0 28`, w: 3.5} as DrawItem]
      : [{d: `M${x - 196} ${y - 214} l18 18 M${x - 222} ${y - 160} l24 4 M${x + 190} ${y - 222} l-18 18 M${x + 218} ${y - 166} l-24 4`, color: AMBER, w: 5} as DrawItem]),
  ];
};

/** MOCKUP (not used by the film yet): the mirror with his real stick body in the reflection: the
 *  same figure as everywhere (pose atDesk: head, neck, torso to the hips, forearms bent, hands in
 *  front), sized to sit inside the glass; the shine kept clear of both the rim and his head; the
 *  trembling marks right beside each hand, drawn over the body. */
export const mirrorV2 = (x: number, y: number, tired: boolean): DrawItem[] => {
  const s = 1.5;
  const feet = y + 395; // where his feet would be: hips at the bottom of the glass, head top at y - 95
  const hx = 30 * s, hy = feet - 150 * s; // the hands (atDesk pose)
  return [
    {d: ellipse(x, y, 170, 230), fill: '#eef3f8', w: 7, speed: 170},
    {d: ellipse(x, y, 150, 210), w: 3.5, opacity: 0.7},
    {d: `M${x - 104} ${y - 96} L${x - 88} ${y - 128} M${x - 110} ${y - 60} L${x - 96} ${y - 88}`, color: '#9fb3cc', w: 4, opacity: 0.8},
    {d: `M${x - 60} ${y + 228} L${x - 90} ${y + 300} M${x + 60} ${y + 228} L${x + 90} ${y + 300}`, w: 6},
    ...man(x, feet, {pose: 'atDesk', s, mood: tired ? 'worried' : 'smile'}),
    ...(tired
      ? [{d: `${place('M-12 4 q12 -8 24 0 M-18 -8 q18 -10 36 0', {x: x - hx + 14, y: hy - 30, rot: 25})} ${place('M-12 4 q12 -8 24 0 M-18 -8 q18 -10 36 0', {x: x + hx - 14, y: hy - 30, rot: -25})}`, w: 3.5} as DrawItem]
      : [{d: `M${x - 196} ${y - 214} l18 18 M${x - 222} ${y - 160} l24 4 M${x + 190} ${y - 222} l-18 18 M${x + 218} ${y - 166} l-24 4`, color: AMBER, w: 5} as DrawItem]),
  ];
};

/** Two hands held out in front, trembling (motion marks) or steady. */
const hands = (x: number, y: number, shaking: boolean): DrawItem[] => [
  {d: `${circ(x - 46, y, 22)} ${circ(x + 46, y, 22)}`, fill: PAPER, w: 5},
  {d: `M${x - 46} ${y + 22} L${x - 56} ${y + 110} M${x + 46} ${y + 22} L${x + 56} ${y + 110}`, w: 6},
  ...(shaking ? [marks(x - 120, y - 30, 0.7), marks(x + 84, y - 30, 0.7)] : []),
];

/** The habit, winning a tug-of-war: a heap of what pulls him back (a bottle, a cigarette, spilled
 *  pills, dice) on one end of a rope, him leaning away on the other. */
const tugOfWar = (ground: number): DrawItem[] => {
  const g = ground;
  // a die standing on the floor at x, 42 wide, with its pips (each pip a filled dot)
  const die = (x: number, pips: [number, number][]): DrawItem[] => [
    {d: rr(x, g - 42, 42, 42, 8), fill: PAPER, w: 4.5},
    {d: pips.map(([u, v]) => circ(x + u * 42, g - 42 + v * 42, 4)).join(' '), color: INK, fill: INK, w: 2},
  ];
  return [
    floor(R0, 900, g),
    // a cigarette on the floor, smoke curling up from its lit end
    {d: rr(150, g - 18, 100, 18, 4), fill: PAPER, w: 4},
    {d: rr(222, g - 18, 28, 18, 4), fill: '#e8b27a', w: 4},
    {d: `M158 ${g - 26} Q146 ${g - 56} 162 ${g - 82} Q176 ${g - 106} 160 ${g - 136}`, color: '#8a8f98', w: 3.5, opacity: 0.8},
    // a bottle
    {d: `M270 ${g} L270 ${g - 120} Q270 ${g - 150} 292 ${g - 164} L292 ${g - 210} L316 ${g - 210} L316 ${g - 164} Q338 ${g - 150} 338 ${g - 120} L338 ${g} Z`, fill: '#cfe0cf', w: 5},
    {d: `M276 ${g - 96} L332 ${g - 96} L332 ${g - 50} L276 ${g - 50} Z`, fill: PAPER, w: 3.5},
    // a pill bottle on its side, its cap, three pills spilled out
    {d: rr(358, g - 46, 76, 46, 8), fill: '#fbf0c4', w: 4.5},
    {d: rr(434, g - 50, 18, 54, 5), fill: PAPER, w: 4},
    {d: `${ellipse(472, g - 8, 11, 7)} ${ellipse(498, g - 8, 11, 7)} ${ellipse(485, g - 22, 11, 7)}`, fill: PAPER, w: 3.5},
    // two dice side by side: a three and a five
    ...die(522, [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]]),
    ...die(574, [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]]),
    // the rope from the bottle's neck to his waist, pulled taut
    {d: `M318 ${g - 190} C420 ${g - 200} 520 ${g - 160} 640 ${g - 136}`, w: 5},
    ...man(700, g, {pose: 'walk', mood: 'determined', flip: true}),
  ];
};

/** A small scoreboard: habit vs him. */
const scoreboard = (x: number, y: number, it: number, him: number): DrawItem[] => [
  {d: rr(x, y, 330, 150, 12), fill: PAPER, w: 5},
  {d: `M${x + 165} ${y + 16} L${x + 165} ${y + 134}`, w: 3.5},
  C('IT', x + 82, y + 50, 40), C(String(it), x + 82, y + 120, 64, RED),
  C('HIM', x + 248, y + 50, 40), C(String(him), x + 248, y + 120, 64),
];

/** Speech bubble (top-left x, y) with its tail pointing at (tx, ty) and lines of text inside. */
const bubble = (x: number, y: number, w: number, h: number, tx: number, ty: number, lines: [string, number, string?][]): DrawItem[] => {
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

const sticky = (x: number, y: number, lines: string[], o: Omit<NoteOpts, 'style'> = {}): DrawItem[] => note(x, y, lines, {...o, style: 'pin'});

/** A storm cloud with rain and one red bolt. */
export const storm = (x: number, y: number, s = 1): DrawItem[] => [
  {d: place(cloud(0, 0, 300, 120), {x, y, s}), fill: PAPER, w: 5.5},
  {d: shadeEllipse(x, y + 6 * s, 148 * s, 46 * s, 12), clip: place(cloud(0, 0, 268, 84), {x, y, s}), w: 3.5, opacity: 0.7, speed: 160},
  {d: place('M-110 70 l-12 36 M-60 76 l-12 36 M70 76 l-12 36 M120 70 l-12 36', {x, y, s}), w: 4.5, speed: 120},
  {d: place('M18 66 L-6 112 L16 112 L-8 160', {x, y, s}), color: RED, w: 6},
];

/** A window at night: the moon inside its top-right pane (the same rule as The Missing Piece). */
const nightWindow = (x: number, y: number, s = 0.8): DrawItem[] => [
  ...windowFrame({x, y, s}),
  moon(x + 52.5 * s, y - 120 * s, 0.775 * s),
];

/** A mobile phone ringing, with vibration marks. */
const phone = (x: number, y: number, s = 1): DrawItem[] => [
  {d: place(rr(-48, -90, 96, 180, 16), {x, y, s}), fill: PAPER, w: 6},
  {d: place(rr(-36, -72, 72, 126, 6), {x, y, s}), w: 3.5},
  {d: place(circ(0, 72, 7), {x, y, s}), w: 3.5},
  {d: place('M-74 -40 Q-84 0 -74 40 M-96 -56 Q-110 0 -96 56 M74 -40 Q84 0 74 40 M96 -56 Q110 0 96 56', {x, y, s}), color: RED, w: 4.5},
];

/** A drinking glass (the party). */
const glass = (x: number, y: number, s = 1): DrawItem[] => [
  {d: place('M-16 0 L-20 -54 L20 -54 L16 0 Z', {x, y, s}), fill: '#fbf0c4', w: 4},
  {d: place('M-19 -38 L19 -38', {x, y, s}), w: 3, opacity: 0.6},
];

/** A bed seen from the side with him asleep: head on the pillow, the blanket over him. */
const bed = (x: number, ground: number): DrawItem[] => [
  {d: `M${x - 260} ${ground} L${x - 260} ${ground - 170} M${x + 260} ${ground} L${x + 260} ${ground - 110}`, w: 6},
  {d: rr(x - 260, ground - 110, 520, 50, 10), fill: PAPER, w: 6},
  {d: rr(x - 240, ground - 152, 96, 42, 20), fill: PAPER, w: 5},
  // a smaller head on the pillow, turned to lie down; his neck runs into the blanket, whose
  // edge starts at his shoulder and covers the body to the foot of the bed
  ...stickHead(0, 0, 28, {mood: 'closed'}).map((it) => (it.d ? {...it, d: place(it.d, {x: x - 182, y: ground - 146, rot: -90})} : it)),
  {d: `M${x - 155} ${ground - 140} L${x - 128} ${ground - 132}`, w: 6},
  {d: `M${x - 140} ${ground - 110} C${x - 140} ${ground - 140} ${x - 110} ${ground - 150} ${x - 70} ${ground - 146} C${x + 20} ${ground - 160} ${x + 160} ${ground - 156} ${x + 250} ${ground - 112}`, fill: '#e4edf5', w: 5.5},
  T('z', x - 130, ground - 195, 40, '#7d8a9c'), T('Z', x - 92, ground - 232, 54, '#7d8a9c'),
];

/** Half of a calendar page torn down the middle, lying on the floor (centre x, y, turned rot):
 *  the month band on top, 3.5 columns x 5 weeks. The left half keeps the page's straight left edge
 *  and is torn on the right; the right half is its mirror (torn on the left, straight right edge),
 *  and the two torn edges fit together. The left half carries `n` (1-3) day strokes in the first
 *  week with the red line struck through them. */
const HALF_W = 84; // 3.5 cells of 24
const RAG = Array.from({length: 12}, (_, i) => (i % 2 ? 9 : 2)); // the shared torn edge, inward offsets
const tornPage = (x: number, y: number, rot: number, n: number, s = 1.35, half: 'left' | 'right' = 'left', length = 31, start = 0): DrawItem[] => {
  const at = {x, y, rot, s};
  const cw = 24, top = -78, band = 20, gy = top + band, rows = Math.ceil((start + length) / 7), bottom = gy + rows * cw, h = HALF_W / 2;
  const ys = RAG.map((_, i) => top + ((bottom - top) * i) / (RAG.length - 1));
  // the page's own x of this half's left edge: 0 (left half) or HALF_W (right half)
  const px0 = half === 'left' ? 0 : HALF_W;
  const lx = (px: number) => px - px0 - h; // page x -> local x
  const tear = ys.map((yy, i) => `${f1(lx(HALF_W + RAG[i]))} ${f1(yy)}`);
  const outline = half === 'left'
    ? `M${lx(0)} ${top} L${tear.join(' L')} L${lx(0)} ${bottom} Z`
    : `M${tear[0]} L${lx(2 * HALF_W)} ${top} L${lx(2 * HALF_W)} ${bottom} L${tear.slice().reverse().join(' L')} Z`;
  const x0 = half === 'left' ? lx(0) : lx(HALF_W + 10);
  const x1 = half === 'left' ? lx(HALF_W) : lx(2 * HALF_W);
  let grid = '';
  for (let r = 1; r < rows; r++) grid += `M${x0} ${gy + r * cw} L${x1} ${gy + r * cw} `;
  for (let c = 1; c < 7; c++) { const cx = c * cw; if (cx > px0 && cx < px0 + HALF_W) grid += `M${lx(cx)} ${gy} L${lx(cx)} ${bottom} `; }
  // the days past the month's end, greyed like on the wall calendars (only the part on this half)
  const [ha, hb] = half === 'left' ? [0, HALF_W - 2] : [HALF_W + 12, 2 * HALF_W];
  let shade = '';
  for (let k = 0; k < rows * 7; k++) {
    if (k >= start && k < start + length) continue;
    const a = Math.max(ha, (k % 7) * cw + 3), b = Math.min(hb, (k % 7) * cw + cw - 3);
    if (b - a < 4) continue;
    const yy = gy + Math.floor(k / 7) * cw + 3;
    shade += `M${f1(lx(a))} ${f1(yy)} L${f1(lx(b))} ${f1(yy)} L${f1(lx(b))} ${f1(yy + cw - 6)} L${f1(lx(a))} ${f1(yy + cw - 6)} Z `;
  }
  const out: DrawItem[] = [
    {d: place(outline, at), fill: PAPER, w: 4, speed: 220},
    ...(shade ? [{d: place(shade, at), color: '#dedad1', fill: '#dedad1', w: 1, speed: 2000} as DrawItem] : []),
    {d: place(`M${x0} ${gy} L${x1} ${gy}`, at), w: 3},
    {d: place(grid, at), w: 2, opacity: 0.6, speed: 300},
  ];
  // the month's first n days, a stroke each, struck through with a red line, row by row, on
  // whichever half each day landed (a day cut by the tear is left out)
  const byRow: Record<number, number[]> = {};
  for (let d = 0; d < n; d++) {
    const k = start + d, cx = (k % 7) * cw + 12;
    if (cx - 6 < ha || cx + 6 > hb) continue;
    (byRow[Math.floor(k / 7)] ??= []).push(cx);
  }
  for (const [r, xs] of Object.entries(byRow)) {
    const ry = gy + Number(r) * cw;
    out.push({d: place(xs.map((cx) => `M${lx(cx)} ${ry + 5} L${lx(cx - 1)} ${ry + 19}`).join(' '), at), w: 3.5});
    out.push({d: place(`M${lx(Math.min(...xs) - 12)} ${ry + 15} L${lx(Math.max(...xs) + 12)} ${ry + 9}`, at), color: RED, w: 4.5});
  }
  return out;
};

/** One run as a bar: a strip of torn calendar standing on the base line, its day count under it. */
const runBar = (x: number, base: number, days: number, scale: number, mark?: string): DrawItem[] => {
  const h = 26 + days * scale;
  return [
    {d: `M${x} ${base} L${x} ${base - h + 6} Q${x} ${base - h} ${x + 6} ${base - h} L${x + 52} ${base - h} Q${x + 58} ${base - h} ${x + 58} ${base - h + 6} L${x + 58} ${base}`,
      fill: days === 40 ? '#f4e2df' : PAPER, w: 5, speed: 170, mark},
    C(String(days), x + 29, base + 52, 40, days === 40 ? RED : INK),
  ];
};

/** The trend over the run bars (as drawn by runBar at x 140 + 90 i, base 900, scale 14): a smooth
 *  red curve a little ABOVE every bar top, and an arrow head along its last direction. */
const trend = (lift = 36): DrawItem[] => {
  const pts = [2, 3, 5, 8, 11, 19, 26, 40].map((d, i) => ({x: 140 + 90 * i, y: 900 - (26 + d * 14) - lift}));
  pts.push({x: 770 + 50, y: pts[pts.length - 1].y - 90});
  let d = `M${pts[0].x - 20} ${pts[0].y + 4}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${f1(p1.x + (p2.x - p0.x) / 6)} ${f1(p1.y + (p2.y - p0.y) / 6)} ${f1(p2.x - (p3.x - p1.x) / 6)} ${f1(p2.y - (p3.y - p1.y) / 6)} ${p2.x} ${p2.y}`;
  }
  const e = pts[pts.length - 1], q = pts[pts.length - 2];
  const a = Math.atan2(e.y - q.y, e.x - q.x);
  const h = (da: number) => `${f1(e.x - Math.cos(a + da) * 30)} ${f1(e.y - Math.sin(a + da) * 30)}`;
  return [{d, color: RED, w: 6}, {d: `M${h(0.5)} L${e.x} ${e.y} L${h(-0.5)}`, color: RED, w: 6}];
};

/** The six torn halves from the floor, taped back into three whole calendar pages on the wall:
 *  each page's two halves joined along their torn edges, tape across the tear. Two pages on top,
 *  one below; (x, y) = centre of the top-left page. */
const tapedPages = (x: number, y: number): DrawItem[] => {
  const k = 1.15;
  const pw = 2 * HALF_W * k; // one whole page
  const pages: [number, number, number, number, number, number][] = [[x, y, -2, 2, 31, 6], [x + pw + 18, y + 6, 2, 3, 30, 2], [x + pw / 2 + 9, y + 196, -1, 1, 31, 4]];
  const tape = (tx: number, ty: number, rot: number): DrawItem => ({d: place(rr(-22, -10, 44, 20, 3), {x: tx, y: ty, rot, s: k}), fill: '#efe2b0', fillOpacity: 0.85, color: '#c9b37a', w: 3});
  return pages.flatMap(([px, py, rot, n, len, st]) => {
    const a = (rot * Math.PI) / 180;
    const d = (HALF_W / 2 + 2) * k;
    const along = (t: number, u: number) => [px + Math.cos(a) * t - Math.sin(a) * u, py + Math.sin(a) * t + Math.cos(a) * u];
    const [lx, ly] = along(-d, 0), [rx, ry] = along(d, 0);
    const [t1x, t1y] = along(6 * k, -30 * k), [t2x, t2y] = along(6 * k, 30 * k);
    return [
      ...tornPage(lx, ly, rot, n, k, 'left', len, st),
      ...tornPage(rx, ry, rot, n, k, 'right', len, st),
      tape(t1x, t1y, 90 + rot - 6), tape(t2x, t2y, 90 + rot + 6),
    ];
  });
};

/** The line chart that climbs off the top of the page (axes from (x, base)). */
const climbChart = (x: number, base: number): DrawItem[] => [
  {d: `M${x} ${base - 560} L${x} ${base} L${x + 700} ${base}`, w: 5},
  ...[1, 2, 3, 4].map((k) => ({d: `M${x + 4} ${base - k * 120} L${x + 700} ${base - k * 120}`, w: 2.5, opacity: 0.35} as DrawItem)),
  ...[[0, '41'], [220, '50'], [420, '70'], [640, '100']].map(([dx, t]) => C(String(t), x + Number(dx) + 30, base + 50, 40)),
];
/** The run line: day 41, 50, 70, then on past the chart's top edge (a short overshoot with an
 *  arrow, well below the words above the chart), dots on the days the narrator names. */
const climbLine = (x: number, base: number): DrawItem[] => {
  const top = base - 560; // the chart's top edge
  const p = [{x: x + 30, y: base - 80}, {x: x + 250, y: base - 200}, {x: x + 450, y: base - 380}, {x: x + 670, y: top - 90}];
  const d = `M${p[0].x} ${p[0].y} C${p[0].x + 90} ${p[0].y - 30} ${p[1].x - 80} ${p[1].y + 40} ${p[1].x} ${p[1].y} ` +
    `C${p[1].x + 80} ${p[1].y - 40} ${p[2].x - 80} ${p[2].y + 60} ${p[2].x} ${p[2].y} C${p[2].x + 90} ${p[2].y - 90} ${p[3].x - 40} ${p[3].y + 160} ${p[3].x} ${p[3].y}`;
  const a = Math.atan2(p[3].y - (p[3].y + 160), p[3].x - (p[3].x - 40));
  const h = (da: number) => `${f1(p[3].x - Math.cos(a + da) * 30)} ${f1(p[3].y - Math.sin(a + da) * 30)}`;
  return [
    {d, color: RED, w: 7, speed: 120},
    {d: `M${h(0.5)} L${p[3].x} ${p[3].y} L${h(-0.5)}`, color: RED, w: 7},
    {d: `${circ(p[1].x, p[1].y, 9)} ${circ(p[2].x, p[2].y, 9)}`, color: RED, fill: RED, w: 3},
  ];
};

/** Stairs built from the runs: eight even steps (70 deep, 40 high), each tread labelled with the
 *  run it stands for. */
const STEP_H = 40;
const stairs = (x: number, base: number): DrawItem[] => {
  const runs = [2, 3, 5, 8, 11, 19, 26, 40];
  let d = `M${x} ${base}`;
  runs.forEach((_, i) => { d += ` L${x + i * 70} ${base - (i + 1) * STEP_H} L${x + (i + 1) * 70} ${base - (i + 1) * STEP_H}`; });
  d += ` L${x + runs.length * 70} ${base} Z`;
  return [
    {d, fill: PAPER, w: 5, speed: 200},
    ...runs.map((r, i) => C(String(r), x + i * 70 + 35, base - i * STEP_H - 12, 26, r === 40 ? RED : INK)),
  ];
};

/* ----------------------------------- the book ----------------------------------- */

export const SPREADS = 16;
const FAST = 18;

export const STEPS: Step[] = [
  // 0 — hook + title
  {id: 'hook', spread: 0, pause: 20, hold: 40, right: [
    T('This is his', R0, R(5), 84, INK, {mark: 'open'}), // not 'hook': plan() auto-plays that mark at frame 6
    T('ninth day one.', R0, R(6) + 16, 96, RED),
    T('And he is about', R0, R(9), 70, INK, {mark: 'hook2'}),
    T('to stop counting.', R0, R(10), 70),
  ]},
  {id: 'title', spread: 0, hold: 20, speed: 1.6, left: [
    C('Day One.', 470, R(3), 150),
    C('Again.', 470, R(5) + 10, 150, RED),
    {d: 'M330 480 C420 500 540 498 640 474 C606 494 590 502 582 514', color: RED, w: 7, speed: 140},
    ...wallCalendar(250, 700, 440, {strokes: [0, 1], crosses: [2], month: 'MARCH'}),
  ]},

  // 1 — the mirror; the one thing he keeps going back to
  {id: 'mirror', spread: 1, hold: 30, left: [
    T('It started with a mirror.', L0, R(13) + 20, 62, INK, {mark: 'mirror'}),
    ...mirrorV2(470, 470, true),
    T('Tired eyes. Shaking hands.', L0, R(15), 52, INK, {mark: 'mirror2'}),
    T("A man he didn't recognize.", L0, R(16), 52, RED),
  ]},
  {id: 'habit', spread: 1, hold: 40, right: [
    T('Everyone has one thing', R0, R(2), 64, INK, {mark: 'habit'}),
    T('they keep going back to.', R0, R(3), 64),
    ...tugOfWar(900),
    ...mk('habit2', scoreboard(560, 950, 7, 0)),
    T('His had been', R0, R(14) + 20, 58), T('winning for years.', R0, R(15) + 20, 58, RED),
  ]},

  // 2 — the calendar, the first small line
  {id: 'calendar', spread: 2, hold: 20, speed: 1.4, left: [
    T('So he hung a calendar on the wall.', L0, R(15), 50, INK, {mark: 'calendar'}),
    T('And drew one small line.', L0, R(16), 50),
    ...wallCalendar(200, 200, 480, {days: 1, month: 'MARCH'}),
    ...man(820, 1100, {pose: 'reachUp', mood: 'determined', flip: true}),
    floor(L0, 900, 1100),
  ]},
  {id: 'day1', spread: 2, hold: 50, right: [
    ...mk('day1', tally(450, 380, 1, 260, INK, 12)),
    C('Day one.', 500, R(11), 130),
  ]},

  // 3 — day two, three... then a bad day at work. He tears the page down.
  {id: 'd2', spread: 3, hold: 20, speed: 1.4, left: [
    T('Day two. Day three.', L0, R(15), 58, INK, {mark: 'd2'}),
    T('He felt it working.', L0, R(16), 58, RED),
    ...wallCalendar(200, 200, 480, {days: 3, month: 'MARCH'}),
    ...man(470, 1100, {pose: 'cheer', mood: 'smile'}),
    floor(L0, 900, 1100),
  ]},
  {id: 'fall1', spread: 3, hold: 30, speed: 1.4, right: [
    T('Then a bad day at work.', R0, R(14), 58, INK, {mark: 'fall1'}),
    T('And by night, it was over.', R0, R(15), 58, RED),
    ...storm(500, 230, 1),
    ...seatedAtDesk({x: 420, ground: 920, person: {mood: 'crushed', hair: 'tufts', ink: 1}}),
    ...nightWindow(230, 560),
    floor(R0, 900, 920),
  ]},
  // the calendar page comes down; on the page under it, day one again
  {id: 'reset1', spread: 3, hold: 40, speed: 1.4, tear: {side: 'left', mark: 'reset1'}, left: [
    C('Day one.', 470, R(11), 110, INK, {mark: 'reset1b'}),
    C('Again.', 470, R(13), 110, RED),
    ...wallCalendar(200, 200, 480, {strokes: [0, 1, 3], crosses: [2], month: 'MARCH'}),
  ]},

  // 4 — five days; a party
  {id: 'try2', spread: 4, flip: FAST, hold: 10, speed: 1.8, left: [
    ...mk('try2', tally(170, 170, 5, 110)),
    T('Five days,', 360, R(2), 66), T('the next time.', 360, R(3), 66),
    T('A party. Friends.', L0, R(16), 58, INK, {mark: 'fall2'}),
    ...bubble(520, 470, 360, 150, 700, 700, [['Come on,', 52], ['just one!', 52, RED]]),
    ...friend(230, 1060, {pose: 'cheer', mood: 'grin'}),
    ...man(480, 1060, {mood: 'worried'}),
    ...friend(730, 1060, {pose: 'handOnHip', mood: 'grin'}),
    ...glass(164, 1060 - 318 + 22), ...glass(296, 1060 - 318 + 22),
    ...glass(730 - 48, 1060 - 122 + 22),
    floor(L0, 900, 1060),
  ]},
  {id: 'reset2', spread: 4, hold: 30, right: [
    C('Day one.', 500, R(12), 120, INK, {mark: 'reset2'}),
    ...tally(320, 320, 5, 150).map((it) => ({...it, speed: 420})),
    strike(320, 320, 5, 150),
  ]},

  // 5 — eight days; a phone call, alone with it
  {id: 'try3', spread: 5, flip: FAST, hold: 20, left: [
    ...mk('try3', tally(170, 170, 8, 110)),
    T('Eight days.', 560, R(2) + 10, 66),
    ...mk('fall3', phone(470, 650, 1.6)),
    T('A phone call. Bad news.', L0, R(14), 58),
    T('He was alone with it.', L0, R(15), 58, RED),
  ]},
  {id: 'reset3', spread: 5, hold: 30, right: [
    C('Day one.', 520, R(15), 110, INK, {mark: 'reset3'}),
    ...tally(560, 330, 8, 110).map((it) => ({...it, speed: 420})),
    strike(560, 330, 8, 110),
    ...man(330, 1000, {pose: 'slump', mood: 'sad'}),
    {d: 'M150 1000 L900 1000', w: 5.5},
    {d: 'M150 720 L150 1000', w: 5.5},
  ]},

  // 6 — the runs blur by: riffle through the weeks to the struck-out numbers
  {id: 'montage', spread: 6, flipThrough: {sheets: 16, perSheet: 2, frames: 66}, pause: 14, hold: 30, left: [
    ...mk('montage', [C('11', 300, 420, 200)]),
    strikeNum('11', 300, 420, 200),
    C('19', 640, 700, 200),
    strikeNum('19', 640, 700, 200),
    C('26', 330, 1000, 200),
    strikeNum('26', 330, 1000, 200),
  ]},
  {id: 'montage2', spread: 6, hold: 40, right: [
    T('And every time,', R0, R(4), 70, INK, {mark: 'montage2'}),
    T('the same red line', R0, R(6), 70, RED),
    {d: `M${R0} ${R(6) + 18} C${R0 + 200} ${R(6) + 6} ${R0 + 400} ${R(6) + 26} ${R0 + 560} ${R(6) + 10}`, color: RED, w: 6},
    T('through the same', R0, R(8), 70),
    T('small number.', R0, R(9), 70),
  ]},

  // 7 — shame, and the voice keeping score
  {id: 'shame', spread: 7, flip: FAST, hold: 20, speed: 1.4, left: [
    T('He stopped telling people', L0, R(2), 58, INK, {mark: 'shame'}),
    T('he was trying.', L0, R(3), 58),
    ...man(320, 1060, {mood: 'sad'}),
    ...friend(640, 1060, {mood: 'neutral'}),
    ...friend(780, 1060, {mood: 'neutral'}),
    ...bubble(150, 470, 340, 140, 320, 690, [["I'm trying", 52]]),
    strikeNum("I'm trying", 320, 556, 52),
    floor(L0, 900, 1060),
    T('Saying it out loud only', L0, R(15), 52, INK, {mark: 'shame2'}),
    T('made the falling louder.', L0, R(16), 52),
  ]},
  {id: 'voice', spread: 7, hold: 60, right: [
    ...mk('voice', stickHead(500, 760, 120, {mood: 'crushed'})),
    {d: `${place(cloud(0, 0, 640, 300), {x: 500, y: 330})}`, color: INK, w: 5.5, fill: PAPER},
    C('You always quit.', 500, 340, 66, INK),
    C('You always will.', 500, 420, 66, RED),
    {d: `${circ(620, 515, 16)} ${circ(610, 558, 10)} ${circ(600, 590, 6)}`, w: 4.5, fill: PAPER},
    T('A voice in his head', R0, R(15), 58),
    T('kept score.', R0, R(16), 58),
  ]},

  // 8 — his best run: forty days. Then day forty-one.
  {id: 'best', spread: 8, flip: FAST, hold: 20, left: [
    ...mk('best', [...tally(150, 130, 20, 80), ...tally(150, 250, 20, 80)]),
    T('His best run yet.', L0, R(6), 62),
    T('Forty days.', L0, R(7) + 10, 90, RED),
    T('He slept through the night.', L0, R(10), 50, INK, {mark: 'best2'}),
    ...bed(470, 1150),
  ]},
  {id: 'fall8', spread: 8, hold: 40, right: [
    T('He laughed again.', R0, R(10), 58, INK, {mark: 'best2b'}),
    ...friend(300, 600, {pose: 'cheer', mood: 'grin'}),
    ...man(560, 600, {pose: 'cheer', mood: 'grin'}),
    T('HA', 380, 260, 48, AMBER), T('HA!', 450, 220, 54, AMBER),
    floor(R0, 900, 600),
    T('Day forty-one...', R0, R(14), 72, INK, {mark: 'fall8'}),
    {d: 'M690 990 L860 1160 M860 990 L690 1160', color: RED, w: 9},
    T('he fell.', R0, R(15) + 6, 72, RED),
  ]},

  // 9 — nine attempts; he rips the calendar off the wall
  {id: 'low', spread: 9, flip: FAST, pause: 20, hold: 20, speed: 1.5, left: [
    T('That night, he stood', L0, R(2), 58, INK, {mark: 'low'}),
    T('in front of the calendar.', L0, R(3), 58),
    ...man(470, 1120, {mood: 'crushed'}),
    floor(L0, 900, 1120),
  ], right: [
    // every run so far, day by day, over four months: a stroke for each clean day, a red cross on
    // each fall (runs of 2, 3, 5, 8, 11, 19, 26, 40 days), and the ninth day one ringed in red
    ...(() => {
      const months: [string, number][] = [['MARCH', 31], ['APRIL', 30], ['MAY', 31], ['JUNE', 30], ['JULY', 31]];
      const strokes: number[][] = months.map(() => []);
      const crosses: number[][] = months.map(() => []);
      const start = months.map((_, i) => months.slice(0, i).reduce((a, [, n]) => a + n, 0));
      const at = (day: number) => { let i = 0; while (i + 1 < months.length && day >= start[i + 1]) i++; return [i, day - start[i]]; };
      let k = 0;
      const put = (into: number[][]) => { const [i, c] = at(k); into[i].push(c); k++; };
      for (const run of [2, 3, 5, 8, 11, 19, 26, 40]) { for (let i = 0; i < run; i++) put(strokes); put(crosses); }
      const W = 300, X = [150, 520], Y = [150, 470, 790];
      const out: DrawItem[] = months.flatMap(([m, n], i) => wallCalendar(X[i % 2], Y[Math.floor(i / 2)], W, {strokes: strokes[i], crosses: crosses[i], month: m, length: n})
        .map((it) => ({...it, speed: (it.speed ?? 160) * 2.5})));
      // the ring around the next day: day one, the ninth
      const [mi, c0] = at(k), cell = W / 7, c = MONTH_START[months[mi][0]] + c0;
      const rx = X[mi % 2] + (c % 7) * cell + cell / 2;
      const ry = Y[Math.floor(mi / 2)] + cell * 0.9 + Math.floor(c / 7) * cell + cell / 2;
      out.push({d: ellipse(rx, ry, cell * 0.46, cell * 0.42), color: RED, w: 5});
      return out;
    })(),
  ]},
  {id: 'low2', spread: 9, hold: 20, left: [
    T('Nine attempts.', L0, R(6), 70, INK, {mark: 'low2'}),
    T('Nine day ones.', L0, R(7), 70, RED),
  ]},
  {id: 'low3', spread: 9, hold: 30, tear: {side: 'right', mark: 'low3'}, right: [
    T('Why even count?', R0, R(4), 84, RED, {mark: 'low3b'}),
    T('The torn pages', R0, R(8), 62, INK, {mark: 'floor'}),
    T('lay on the floor.', R0, R(9), 62),
    ...tornPage(230, 910, -14, 2, 1.35, 'left', 31, 6), ...tornPage(410, 940, 10, 2, 1.35, 'right', 31, 6),
    ...tornPage(590, 900, -6, 3, 1.35, 'left', 30, 2), ...tornPage(770, 940, 12, 3, 1.35, 'right', 30, 2),
    ...tornPage(340, 1140, 20, 1, 1.35, 'left', 31, 4), ...tornPage(640, 1150, -16, 1, 1.35, 'right', 31, 4),
  ]},

  // 10 — side by side: every run longer than the one before
  {id: 'floor2', spread: 10, flip: 30, pause: 10, hold: 30, left: [
    T('And for the first time,', L0, R(3), 62, INK, {mark: 'floor2'}),
    T('he looked at them', L0, R(4), 62),
    T('side by side.', L0, R(5), 62, RED),
    ...man(470, 1120, {pose: 'slump', mood: 'worried'}),
    {d: 'M120 1120 L900 1120', w: 5.5},
  ]},
  {id: 'bars', spread: 10, hold: 20, speed: 1.3, right: [
    {d: 'M120 900 L900 900', w: 5.5},
    ...runBar(140, 900, 2, 14, 'bars'), ...runBar(230, 900, 3, 14), ...runBar(320, 900, 5, 14), ...runBar(410, 900, 8, 14),
    ...runBar(500, 900, 11, 14, 'bars2'), ...runBar(590, 900, 19, 14), ...runBar(680, 900, 26, 14), ...runBar(770, 900, 40, 14),
  ]},
  {id: 'climb', spread: 10, hold: 30, right: [
    ...mk('climb', trend()),
    T('Every run was longer', R0, R(15), 54),
    T('than the one before.', R0, R(16), 54),
  ]},
  {id: 'climb2', spread: 10, hold: 60, right: [
    T("He hadn't been failing.", R0, R(1), 58, INK, {mark: 'climb2'}),
    T('He had been climbing.', R0, R(2) + 10, 70, RED),
  ]},
  {id: 'notes', spread: 10, hold: 30, left: [
    T('And every fall', L0, R(8), 62, INK, {mark: 'notes'}),
    T('had left him something.', L0, R(9), 62),
  ]},

  // back through the book in one swing, to read each fall again with what it taught him
  {id: 'note1', spread: 3, bulk: {frames: 54}, pause: 20, hold: 60, right: [
    ...mk('note1', sticky(780, 520, ['Day 3:', 'bad days', 'need a plan.'], {w: 300, h: 220, rot: 4, size: 46, color: RED})),
  ]},
  {id: 'note2', spread: 4, flip: 26, hold: 60, right: [
    ...mk('note2', sticky(520, 1140, ['Day 5:', 'say no,', 'and leave early.'], {w: 380, h: 220, rot: -3, size: 48, color: RED})),
  ]},
  {id: 'note3', spread: 5, flip: 26, hold: 60, right: [
    ...mk('note3', sticky(700, 680, ['Day 8:', 'call someone.', "Don't carry it alone."], {w: 400, h: 220, rot: 3, size: 42, color: RED})),
  ]},
  {id: 'note4', spread: 8, flipThrough: {sheets: 8, perSheet: 2, frames: 44}, pause: 14, hold: 70, left: [
    ...mk('note4', sticky(760, 600, ['Day 40:', 'this is what', 'life can feel like.', ''], {w: 340, h: 270, rot: -4, size: 40, color: RED})),
    heart(766, 688, 0.6),
  ]},

  // forward again, past everything, to a fresh spread
  {id: 'zero', spread: 11, flipThrough: {sheets: 10, perSheet: 2, frames: 50}, pause: 14, hold: 30, left: [
    ...mk('zero', [C('1', 300, 760, 420)]),
    {d: 'M476 640 L564 640 M476 682 L564 682', w: 12},
    {d: 'M548 596 L492 726', color: RED, w: 9},
    C('0', 720, 760, 420),
    T('Day one was never zero.', L0, R(14), 64, RED),
  ]},
  {id: 'zero2', spread: 11, hold: 60, right: [
    T('It was day one,', R0, R(5), 76, INK, {mark: 'zero2'}),
    T('with everything', R0, R(7), 76),
    T("he'd learned.", R0, R(8), 76, RED),
    ...tally(260, 900, 1, 200, RED, 12),
    ...sticky(640, 1000, ['plan', 'say no', 'call'], {w: 240, h: 200, rot: 5, size: 40, color: RED}),
  ]},

  // 12 — the pages taped together, a new calendar; this time he tells a friend
  {id: 'rehang', spread: 12, flip: 30, hold: 20, speed: 1.4, left: [
    T('So he taped the pages back together,', L0, R(15), 44, INK, {mark: 'rehang'}),
    T('and hung a new calendar beside them.', L0, R(16), 44),
    ...tapedPages(205, 400),
    ...wallCalendar(595, 350, 320, {days: 1, month: "JULY"}),
    ...man(470, 1100, {pose: 'stand', mood: 'determined'}),
    floor(L0, 900, 1100),
  ]},
  {id: 'tell', spread: 12, hold: 24, speed: 1.4, right: [
    T('This time, he told a friend.', R0, R(16), 58, INK, {mark: 'tell'}),
    ...man(330, 1000, {pose: 'stand', mood: 'neutral'}),
    ...friend(640, 1000, {pose: 'reachUp', mood: 'smile', flip: true}),
    ...bubble(110, 480, 380, 140, 330, 664, [["I'm trying", 50], ['to quit.', 50]]),
    ...bubble(520, 480, 360, 140, 640, 664, [["I've got you.", 52, RED]]),
    heart(485, 760, 1.2),
    floor(R0, 900, 1000),
  ]},

  // 13 — forty-one comes and goes: a long riffle, the line climbing off the page
  {id: 'rise', spread: 13, flipThrough: {sheets: 26, perSheet: 3, frames: 80}, pause: 6, hold: 16, left: [
    T('Day forty-one came.', L0, R(2), 72, INK, {mark: 'rise'}),
    T('And went.', L0, R(3) + 10, 90, RED),
    ...wallCalendar(80, 520, 390, {days: 31, month: 'JULY'}).map((it) => ({...it, speed: (it.speed ?? 160) * 2})),
    ...wallCalendar(500, 520, 390, {days: 10, month: 'AUGUST'}).map((it) => ({...it, speed: (it.speed ?? 160) * 2})),
    C('31 + 10 = 41 days', 470, R(14), 60, RED),
  ]},
  {id: 'rise2', spread: 13, hold: 20, right: [
    T('Fifty.', R0, R(1), 54, INK, {mark: 'rise2'}), T('Seventy.', R0 + 170, R(1), 54), T('One hundred.', R0 + 380, R(1), 54, RED),
    ...climbChart(170, 1100).map((it) => ({...it, speed: 320})),
    ...climbLine(170, 1100),
  ]},
  {id: 'rise3', spread: 13, hold: 50, right: [
    T('The line grew right off', R0, R(3), 54, INK, {mark: 'rise3'}),
    T('the top of the chart.', R0, R(4), 54),
  ]},

  // 14 — the mirror again; and an honest promise
  {id: 'mirror3', spread: 14, flip: 30, hold: 30, left: [
    T('One morning,', L0, R(1), 62, INK, {mark: 'mirror3'}),
    T('the mirror again.', L0, R(2), 62),
    ...mk('mirror4', mirrorV2(470, 700, false)),
    T('He knew this man.', L0, R(16), 58, RED),
  ]},
  {id: 'honest', spread: 14, hold: 30, right: [
    T("Maybe he'll fall again someday.", R0, R(2), 52, INK, {mark: 'honest'}),
    ...stairs(160, 1000),
    ...man(160 + 7 * 70 + 35, 1000 - 8 * STEP_H, {pose: 'cheer', mood: 'smile', s: 0.8}),
    {d: 'M150 1000 L900 1000', w: 5.5},
    T('But he will never', R0, R(14) + 30, 66, INK, {mark: 'honest2'}),
    T('start from zero.', R0, R(15) + 30, 66, RED),
  ]},

  // 15 — to you
  {id: 'you', spread: 15, flip: 30, pause: 20, hold: 30, left: [
    C('If today is your', 470, R(5), 84, INK, {mark: 'you'}),
    C('day one again...', 470, R(7), 84),
    ...tally(440, 760, 1, 300, RED, 14),
  ]},
  {id: 'you2', spread: 15, hold: 90, right: [
    T('Starting over', R0, R(6), 96, INK, {mark: 'you2'}),
    T('is not starting', R0, R(8), 96),
    T('from zero.', R0, R(10), 110, RED),
    {d: `M${R0} ${R(10) + 30} C${R0 + 160} ${R(10) + 14} ${R0 + 320} ${R(10) + 36} ${R0 + 470} ${R(10) + 18}`, color: RED, w: 7},
  ]},
];

/* ------------------------------ the Shorts / Reels cut ------------------------------ */
// The core of the story for a vertical feed: the hook, the habit that keeps winning, the first fall and the torn page, the runs
// blurring by, his best run and day forty-one, the night he rips the calendar down, the runs side
// by side, "day one was never zero", the climb to a hundred, and the close. Same pages and lines as
// the full film; the book simply has fewer of them.
const SHORT_IDS = [
  'hook', 'title', 'mirror', 'habit', 'calendar', 'day1', 'd2', 'fall1', 'reset1', 'montage', 'best', 'fall8',
  'low', 'low2', 'low3', 'floor2', 'bars', 'climb', 'climb2', 'zero', 'zero2', 'rise', 'rise2', 'you', 'you2',
];
const SHORT_SPREAD: Record<number, number> = {0: 0, 1: 1, 2: 2, 3: 3, 6: 4, 8: 5, 9: 6, 10: 7, 11: 8, 13: 9, 15: 10};
export const SHORT_SPREADS = 11;
// feed pacing: the narration still leads (the pencil waits for it), but the silent reading holds
// are short, the pencil draws faster and pages turn quicker
export const SHORT_STEPS: Step[] = STEPS.filter((s) => SHORT_IDS.includes(s.id)).map((s) => ({
  ...s,
  spread: SHORT_SPREAD[s.spread],
  hold: Math.min(s.hold ?? 45, s.id === 'you2' ? 30 : 8),
  speed: (s.speed ?? 1) * 3,
  flip: Math.min(s.flip ?? 34, 20),
  pause: Math.min(s.pause ?? 6, 8),
  ...(s.flipThrough ? {flipThrough: {...s.flipThrough, frames: Math.min(s.flipThrough.frames ?? 70, 50)}} : {}),
}));
