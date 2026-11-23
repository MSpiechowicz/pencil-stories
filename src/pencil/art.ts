// Line-art library: characters and props as ordered pencil strokes (DrawItem[]).
// Style: clean uniform line (5px), rounded corners, nested outlines and real inner detail.
import type {DrawItem, Pt} from './draw';
import {circ, ellipse, hLines, place, rr, vLines} from './geo';

export const INK = '#2f3338';
export const RED = '#d2463c';
export const AMBER = '#e2a22c';
export const PAPER = '#fbfaf6';
export const LIGHT = '#fff2cf';

type At = {x: number; y: number; s?: number; flip?: boolean; color?: string; speed?: number};

/** Place a list of local paths as draw items. */
const parts = (ds: (string | [string, Partial<DrawItem>])[], at: At, base: Partial<DrawItem> = {}): DrawItem[] =>
  ds.map((p) => {
    const [d, extra] = typeof p === 'string' ? [p, {}] : p;
    return {
      d: place(d, at),
      color: at.color ?? INK,
      speed: at.speed,
      ...base,
      ...extra,
      // one ink for everything: 6.5px outlines, 4.5px details
      w: Math.max(4.5, (extra.w ?? base.w ?? 6.5) as number + ((extra.w ?? base.w) !== undefined ? 1 : 0)) * Math.max(0.75, Math.min(1, at.s ?? 1)),
    };
  });

/* =================================== characters =================================== */
// Proportions: ~6 heads tall (head r=26, total ~310). Shoulders wider than the waist,
// legs about half the height, arms start at the shoulders.

type Limb = [Pt, Pt, Pt];
type View = 'front' | 'side' | 'back';
type Pose = {view: View; head: Pt; neck: Pt; hip: Pt; armB: Limb; armF: Limb; legB: Limb; legF: Limb; legs?: boolean};
const P = (x: number, y: number): Pt => ({x, y});
const R = 26; // head radius

const FRONT_LEGS = {legB: [P(-13, -150), P(-15, -80), P(-16, -12)] as Limb, legF: [P(13, -150), P(15, -80), P(16, -12)] as Limb};
export const POSES = {
  stand: {view: 'front', head: P(0, -284), neck: P(0, -256), hip: P(0, -150), ...FRONT_LEGS,
    armB: [P(-33, -230), P(-43, -186), P(-47, -140)], armF: [P(33, -230), P(43, -186), P(47, -140)]},
  despair: {view: 'front', head: P(0, -280), neck: P(0, -254), hip: P(0, -150), ...FRONT_LEGS,
    armB: [P(-33, -230), P(-64, -258), P(-28, -296)], armF: [P(33, -230), P(64, -258), P(28, -296)]},
  cheer: {view: 'front', head: P(0, -284), neck: P(0, -256), hip: P(0, -150),
    legB: [P(-13, -150), P(-22, -80), P(-30, -12)], legF: [P(13, -150), P(22, -80), P(30, -12)],
    armB: [P(-33, -230), P(-60, -270), P(-68, -322)], armF: [P(33, -230), P(60, -270), P(68, -322)]},
  reach: {view: 'front', head: P(0, -284), neck: P(0, -256), hip: P(0, -150), ...FRONT_LEGS,
    armB: [P(-33, -230), P(-68, -222), P(-104, -214)], armF: [P(33, -230), P(58, -190), P(80, -150)]},
  back: {view: 'back', head: P(0, -284), neck: P(0, -256), hip: P(0, -150), legs: false, ...FRONT_LEGS,
    armB: [P(-33, -230), P(-58, -196), P(-30, -176)], armF: [P(33, -230), P(58, -196), P(30, -176)]},
  run: {view: 'side', head: P(26, -282), neck: P(18, -254), hip: P(0, -150),
    armB: [P(12, -232), P(-20, -200), P(-48, -182)], armF: [P(18, -232), P(48, -206), P(72, -228)],
    legB: [P(-4, -150), P(-46, -96), P(-92, -76)], legF: [P(4, -150), P(54, -104), P(46, -12)]},
  slump: {view: 'side', head: P(50, -144), neck: P(34, -120), hip: P(0, -32),
    armB: [P(20, -110), P(48, -82), P(74, -70)], armF: [P(26, -110), P(56, -86), P(82, -72)],
    legB: [P(-6, -30), P(56, -84), P(92, -12)], legF: [P(0, -30), P(66, -92), P(104, -12)]},
} satisfies Record<string, Pose>;

export type Mood = 'smile' | 'sad' | 'neutral' | 'closed';
export type Hair = 'short' | 'long' | 'pigtails';

const tubePath = (l: Pt[]) => l.map((p, k) => `${k ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

// head details, authored for a head of radius 34 centred at 0,0 (scaled to R)
const HAIR_SHORT_FRONT = 'M-35 -2 C-38 -40 -8 -46 6 -40 C22 -46 40 -30 35 -2 C28 -18 16 -24 2 -22 C-12 -26 -26 -18 -35 -2 Z';
const HAIR_SHORT_SIDE = 'M-34 4 C-40 -36 0 -46 24 -34 C34 -28 36 -18 34 -10 C22 -22 4 -22 -6 -16 C-14 -6 -20 4 -34 4 Z';
const HAIR_SHORT_BACK = 'M-35 4 C-40 -44 40 -44 35 4 C30 22 18 30 0 30 C-18 30 -30 22 -35 4 Z';
const HAIR_LONG_BACK = 'M-36 0 C-42 -46 42 -46 36 0 C38 30 44 62 50 84 C30 90 -30 90 -50 84 C-44 62 -38 30 -36 0 Z';
const HAIR_LONG_FRINGE = 'M-34 -4 C-30 -34 30 -34 34 -4 C20 -22 -20 -22 -34 -4 Z';
const HAIR_PIG = 'M-34 -4 C-30 -40 30 -40 34 -4 C18 -20 -18 -20 -34 -4 Z';

export const person = (o: {
  x: number; y: number; s?: number; pose?: keyof typeof POSES; flip?: boolean; color?: string;
  mood?: Mood; hair?: Hair; tie?: boolean; badge?: boolean; dress?: boolean; child?: boolean; speed?: number;
}): DrawItem[] => {
  const pose: Pose = POSES[o.pose ?? 'stand'];
  const s = o.s ?? 1;
  const at: At = {x: o.x, y: o.y, s, flip: o.flip, color: o.color, speed: o.speed};
  const c = o.color ?? INK;
  const lw = 5 * Math.max(0.6, Math.min(1, s));
  // children: bigger head relative to body
  const hr = R * (o.child ? 1.3 : 1);
  const h = o.child ? P(pose.head.x, pose.head.y + 4) : pose.head;
  const tube = (l: Pt[], width: number): DrawItem => ({d: place(tubePath(l), at), tube: width * s, color: c, w: lw, inner: PAPER, speed: o.speed});
  const head = (d: string, extra: Partial<DrawItem> = {}): DrawItem[] =>
    parts([[place(d, {x: h.x, y: h.y, s: hr / 34}), extra]], at, {w: 4});
  const out: DrawItem[] = [];
  const foot = (l: Limb, dir: number) => tube([P(l[2].x - 3 * dir, l[2].y + 3), P(l[2].x + 13 * dir, l[2].y + 3)], 18);
  const hand = (l: Limb) => parts([circ(l[2].x, l[2].y, 8)], at, {fill: PAPER, w: 4});

  if (o.hair === 'long') out.push(...head(HAIR_LONG_BACK, {fill: c, fillOpacity: 0.85}));

  // legs (behind the torso)
  if (pose.legs !== false) {
    const dirB = pose.view === 'side' ? 1 : -1;
    out.push(tube(pose.legB, 25), foot(pose.legB, dirB));
    if (pose.view === 'side') out.push(tube(pose.armB, 19), ...hand(pose.armB));
    out.push(tube(pose.legF, 25), foot(pose.legF, 1));
  }
  // arms behind the torso in back view
  if (pose.view === 'back') out.push(tube(pose.armB, 19), tube(pose.armF, 19));
  // neck
  out.push(tube([P(pose.neck.x, pose.neck.y - 4), P(pose.neck.x, pose.neck.y + 16)], 16));
  // torso: tapered shirt (front/back) or a slim tube (side)
  if (pose.view === 'side') {
    out.push(tube([P(pose.neck.x - 2, pose.neck.y + 18), pose.hip], 44));
  } else {
    const n = pose.neck;
    const shirt = `M${n.x - 34} ${n.y + 16} C${n.x - 40} ${n.y + 50} ${n.x - 30} ${n.y + 80} ${n.x - 26} ${pose.hip.y + 6} L${n.x + 26} ${pose.hip.y + 6} C${n.x + 30} ${n.y + 80} ${n.x + 40} ${n.y + 50} ${n.x + 34} ${n.y + 16} Q${n.x} ${n.y + 6} ${n.x - 34} ${n.y + 16} Z`;
    const dress = `M${n.x - 32} ${n.y + 16} C${n.x - 38} ${n.y + 50} ${n.x - 30} ${n.y + 80} ${n.x - 26} ${pose.hip.y - 10} L${n.x - 46} ${pose.hip.y + 64} L${n.x + 46} ${pose.hip.y + 64} L${n.x + 26} ${pose.hip.y - 10} C${n.x + 30} ${n.y + 80} ${n.x + 38} ${n.y + 50} ${n.x + 32} ${n.y + 16} Q${n.x} ${n.y + 6} ${n.x - 32} ${n.y + 16} Z`;
    out.push(...parts([[o.dress ? dress : shirt, {fill: PAPER}]], at));
    if (pose.view === 'front') {
      out.push(...parts([`M${n.x - 11} ${n.y + 12} L${n.x} ${n.y + 26} L${n.x + 11} ${n.y + 12}`], at, {w: 3.5}));
      if (!o.dress) out.push(...parts([`M${n.x - 27} ${pose.hip.y - 6} L${n.x + 27} ${pose.hip.y - 6}`], at, {w: 3.5}));
      if (o.tie) out.push(...parts([[`M${n.x} ${n.y + 26} L${n.x - 6} ${n.y + 34} L${n.x} ${n.y + 74} L${n.x + 6} ${n.y + 34} Z`, {color: RED, fill: RED}]], at, {w: 3.5}));
      if (o.badge) out.push(...parts([[rr(n.x + 12, n.y + 40, 14, 18, 3), {color: RED}]], at, {w: 3.5}));
    } else {
      out.push(...parts([`M${n.x} ${n.y + 14} L${n.x} ${pose.hip.y - 4}`], at, {w: 3, opacity: 0.5}));
    }
  }
  // arms in front
  if (pose.view === 'front') out.push(tube(pose.armB, 19), ...hand(pose.armB));
  if (pose.view !== 'back') out.push(tube(pose.armF, 19), ...hand(pose.armF));

  // head
  out.push(...parts([[circ(h.x, h.y, hr), {fill: PAPER}]], at));
  const hairFill = {fill: c, fillOpacity: 0.85};
  if (pose.view === 'back') {
    out.push(...parts([`${circ(h.x - hr - 2, h.y + 4, 6)} ${circ(h.x + hr + 2, h.y + 4, 6)}`], at, {w: 3.5}));
    out.push(...head(o.hair === 'long' ? HAIR_LONG_BACK : HAIR_SHORT_BACK, hairFill));
  } else if (o.hair === 'long') out.push(...head(HAIR_LONG_FRINGE, hairFill));
  else if (o.hair === 'pigtails') {
    out.push(...head(HAIR_PIG, hairFill), ...head(`${circ(-44, -4, 12)} ${circ(44, -4, 12)}`, hairFill));
  } else out.push(...head(pose.view === 'side' ? HAIR_SHORT_SIDE : HAIR_SHORT_FRONT, hairFill));

  // face (authored at r=34)
  if (pose.view !== 'back') {
    const mood = o.mood ?? 'neutral';
    const f: string[] = [];
    let eyes = '';
    if (pose.view === 'front') {
      if (mood === 'closed') f.push('M-18 -2 Q-12 2 -6 -2 M6 -2 Q12 2 18 -2');
      else eyes = `${circ(-12, -4, 3.4)} ${circ(12, -4, 3.4)}`;
      if (mood === 'smile') f.push('M-11 12 Q0 22 11 12');
      if (mood === 'sad' || mood === 'closed') f.push('M-9 19 Q0 12 9 19', 'M-20 -15 L-8 -12 M20 -15 L8 -12');
      if (mood === 'neutral') f.push('M-7 15 L7 15');
    } else {
      if (mood === 'closed') f.push('M8 -2 Q14 2 20 -2');
      else eyes = circ(15, -4, 3.4);
      f.push('M33 -4 L40 6 L32 8');
      if (mood === 'smile') f.push('M14 16 Q22 22 28 14');
      else if (mood === 'neutral') f.push('M16 18 L27 17');
      else f.push('M14 20 Q21 14 28 20');
    }
    if (eyes) out.push(...head(eyes, {fill: c, w: 3}));
    out.push(...head(f.join(' '), {w: 3.2, speed: 40}));
  }
  // ground shadow
  if ((o.pose ?? 'stand') !== 'run') out.push(...parts([['M-40 2 Q0 9 40 2', {opacity: 0.4}]], {...at, flip: false}, {w: 4}));
  return out;
};

/** Seat seen from behind (draw after a person with pose 'back'). */
export const chairBack = (at: At) => parts([
  [rr(-64, -200, 128, 96, 16), {fill: PAPER}],
  [rr(-50, -186, 100, 68, 10), {w: 3.5}],
  'M0 -104 L0 -60', [rr(-78, -66, 156, 18, 8), {fill: PAPER}],
  'M0 -48 L0 -26 M-60 -22 L60 -22', circ(-60, -10, 10), circ(0, -10, 10), circ(60, -10, 10),
], at);

/** A quick small figure for crowds (few strokes, fast). */
export const tiny = (x: number, y: number, s = 0.42, color = INK, speed = 140): DrawItem[] => {
  const at: At = {x, y, s, color, speed};
  return [
    {d: place(tubePath([P(-12, -150), P(-14, -12)]), at), tube: 25 * s, inner: PAPER, color, w: 3.5, speed},
    {d: place(tubePath([P(12, -150), P(14, -12)]), at), tube: 25 * s, inner: PAPER, color, w: 3.5, speed},
    {d: place('M-34 -240 C-40 -200 -30 -170 -26 -144 L26 -144 C30 -170 40 -200 34 -240 Q0 -250 -34 -240 Z', at), fill: PAPER, color, w: 3.5, speed},
    {d: place(circ(0, -280, 26), at), fill: PAPER, color, w: 3.5, speed},
  ];
};

/* ===================================== props ===================================== */

/** Desk: work surface at y = -DESK_TOP (scaled). */
export const DESK_TOP = 172;
export const desk = (at: At) => parts([
  rr(-290, -172, 580, 22, 6),
  rr(110, -150, 160, 150, 6),
  [rr(124, -138, 132, 62, 4), {w: 4}], [rr(124, -68, 132, 60, 4), {w: 4}],
  [rr(172, -112, 36, 8, 4), {w: 4}], [rr(172, -42, 36, 8, 4), {w: 4}],
  rr(-272, -150, 24, 150, 5),
], at);

export const monitor = (at: At) => parts([
  rr(-150, -250, 300, 190, 14),
  [rr(-134, -236, 268, 150, 6), {w: 4}],
  [rr(-26, -80, 14, 9, 3), {w: 3}], [rr(-7, -80, 14, 9, 3), {w: 3}], [rr(12, -80, 14, 9, 3), {w: 3}],
  'M-20 -60 L-24 -22 M20 -60 L24 -22',
  rr(-64, -24, 128, 24, 8),
], at);

export const keyboard = (at: At) => parts([
  rr(-130, -34, 260, 34, 12),
  [rr(-118, -26, 236, 18, 4), {w: 3.5}],
  [vLines(-26, -8, -98, 98, 12), {w: 3}],
  [hLines(-118, 118, -17, -17, 1), {w: 3}],
], at);

export const tower = (at: At) => parts([
  rr(-62, -250, 124, 250, 8),
  'M-62 -232 L-80 -214 L-80 -4 L-62 4',
  [rr(-44, -228, 88, 22, 4), {w: 4}], [rr(-44, -198, 88, 22, 4), {w: 4}],
  circ(0, -140, 16), [circ(0, -140, 7), {w: 4}],
  [hLines(-40, 40, -100, -30, 8), {w: 3}],
], at);

export const officeChair = (at: At) => parts([
  rr(-70, -150, 26, 120, 10),
  rr(-70, -128, 140, 22, 10),
  'M0 -106 L0 -36 M-56 -24 L56 -24 M0 -36 L0 -24',
  circ(-56, -12, 11), circ(0, -12, 11), circ(56, -12, 11),
], at);

export const mug = (at: At) => parts([
  rr(-18, -46, 36, 46, 6), 'M18 -36 C34 -36 34 -12 18 -12',
  ['M-6 -58 C-12 -70 0 -76 -6 -90 M8 -58 C2 -70 14 -76 8 -90', {w: 3.5, opacity: 0.6}],
], at);

const leaf = (x: number, y: number, rot: number, s = 1) =>
  place('M0 0 C8 -18 26 -22 40 -16 C30 -2 14 4 0 0 Z M0 0 L30 -12', {x, y, rot, s});

export const plant = (at: At) => parts([
  'M-28 -50 L28 -50 L22 0 L-22 0 Z', rr(-34, -62, 68, 14, 5),
  'M0 -62 C-2 -90 4 -110 0 -140',
  [leaf(0, -80, -150), {w: 4}], [leaf(0, -96, -30), {w: 4}], [leaf(0, -114, -160), {w: 4}], [leaf(0, -128, -40), {w: 4}],
], at);

export const lamp = (at: At) => parts([
  rr(-40, -16, 80, 16, 6), 'M0 -16 L-30 -110 L40 -170',
  'M20 -186 L80 -186 L96 -140 L4 -140 Z',
  [`M20 -132 L-10 -60 M50 -132 L50 -50 M80 -132 L110 -60`, {color: AMBER, w: 4, opacity: 0.8}],
], at);

export const books = (at: At) => parts([
  rr(-90, -36, 180, 36, 5), [hLines(-80, 80, -18, -18, 1), {w: 3}],
  rr(-80, -70, 168, 34, 5), [vLines(-64, -40, 60, 60, 1), {w: 3}],
  rr(-96, -102, 172, 32, 5), [vLines(-96, -74, -70, -70, 1), {w: 3}],
], at);

export const laptop = (at: At, screen: string[] = []) => parts([
  rr(-160, -240, 320, 210, 14),
  [rr(-144, -226, 288, 176, 6), {w: 4}],
  'M-190 -30 L190 -30 L172 0 L-172 0 Z',
  [rr(-34, -24, 68, 12, 4), {w: 3}],
  ...screen,
], at);

export const envelope = (at: At, color = INK) => parts([
  rr(-110, -150, 220, 150, 10),
  'M-104 -144 L0 -66 L104 -144',
  'M-104 -6 L-36 -62 M104 -6 L36 -62',
], {...at, color});

export const box = (at: At) => parts([
  'M-120 -150 L120 -150 L120 0 L-120 0 Z',
  'M-120 -150 L-80 -196 L160 -196 L120 -150',
  'M120 0 L160 -46 L160 -196',
  ['M-120 -150 L-150 -112 M120 -150 L150 -116', {w: 4}],
  [rr(-60, -110, 120, 40, 4), {w: 4}], [hLines(-46, 46, -98, -82, 2), {w: 3}],
  // things inside: a frame and a plant
  'M-70 -150 L-70 -230 L10 -230 L10 -150', [rr(-58, -218, 56, 56, 3), {w: 3.5}],
  'M60 -150 C58 -180 66 -200 60 -230', [leaf(60, -196, -150, 0.8), {w: 4}], [leaf(60, -214, -30, 0.8), {w: 4}],
], at);

export const door = (at: At, glow = false) => parts([
  [rr(-80, -300, 160, 300, 6), glow ? {fill: LIGHT} : {}],
  [rr(-62, -280, 124, 120, 4), {w: 4}], [rr(-62, -140, 124, 120, 4), {w: 4}],
  circ(54, -150, 7),
], at);

export const sign = (at: At) => parts([rr(-110, -64, 220, 64, 8), [rr(-100, -56, 200, 48, 5), {w: 3.5}]], at);

export const paperSheet = (at: At, lines = 2) => parts([
  [rr(-160, -90, 320, 90, 6), {fill: PAPER}], [hLines(-130, 130, -32, -16, lines), {w: 3, opacity: 0.6}],
], at);

export const calendar = (at: At) => parts([
  rr(-110, -200, 220, 200, 10), 'M-110 -150 L110 -150',
  [rr(-84, -216, 14, 30, 6), {w: 4}], [rr(70, -216, 14, 30, 6), {w: 4}],
], at);

export const house = (at: At, lit = false) => parts([
  'M-180 0 L-180 -200 L180 -200 L180 0 Z',
  'M-210 -190 L0 -340 L210 -190',
  [hLines(-120, 120, -240, -240, 1), {w: 3, opacity: 0.6}], [hLines(-60, 60, -285, -285, 1), {w: 3, opacity: 0.6}],
  // chimney sides stop on the roof slope (roof: y = -340 + x * 150 / 210)
  'M100 -268.6 L100 -320 L140 -320 L140 -240',
  [rr(-150, -160, 90, 80, 4), lit ? {fill: LIGHT} : {}], ['M-105 -160 L-105 -80 M-150 -120 L-60 -120', {w: 4}],
  [rr(60, -160, 90, 80, 4), lit ? {fill: LIGHT} : {}], ['M105 -160 L105 -80 M60 -120 L150 -120', {w: 4}],
  [rr(-36, -130, 72, 130, 4), lit ? {fill: LIGHT} : {}], [circ(24, -64, 5), {w: 4}],
], at);

export const cloud = (cx: number, cy: number, w: number, h: number) => {
  const l = cx - w / 2;
  const b = cy + h / 2;
  return `M${l} ${b} A${h * 0.45} ${h * 0.45} 0 0 1 ${l + w * 0.12} ${b - h * 0.6} A${h * 0.55} ${h * 0.55} 0 0 1 ${l + w * 0.42} ${b - h * 0.9} A${h * 0.5} ${h * 0.5} 0 0 1 ${l + w * 0.74} ${b - h * 0.8} A${h * 0.45} ${h * 0.45} 0 0 1 ${l + w} ${b} Z`;
};

export const sun = (cx: number, cy: number, r: number, color = AMBER): DrawItem[] => {
  const rays = Array.from({length: 10}, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return `M${cx + Math.cos(a) * (r + 14)} ${cy + Math.sin(a) * (r + 14)} L${cx + Math.cos(a) * (r + 40)} ${cy + Math.sin(a) * (r + 40)}`;
  }).join(' ');
  return [{d: circ(cx, cy, r), color, w: 6}, {d: rays, color, w: 5}];
};

export const heart = (x: number, y: number, s = 1, color = RED): DrawItem => ({
  d: place('M0 0 C-10 -18 -36 -8 -22 12 L0 32 L22 12 C36 -8 10 -18 0 0 Z', {x, y, s}),
  color, fill: color, w: 5,
});

export const check = (x: number, y: number, s = 1, color = RED): DrawItem => ({d: place('M-14 0 L-4 12 L18 -14', {x, y, s}), color, w: 6.5});

/** Laptop seen from behind (the person sits behind it, facing us). */
export const laptopBack = (at: At) => parts([
  [rr(-130, -150, 260, 144, 12), {fill: PAPER}],
  [circ(0, -80, 12), {w: 4.5}],
  'M-142 -6 L142 -6',
], at);

/** Office chair seen from the front, sitting behind a person. */
export const chairBackrest = (at: At) => parts([rr(-74, -150, 148, 118, 22), [rr(-60, -138, 120, 92, 14), {w: 4.5}]], at);

export const photoFrame = (at: At) => parts([
  [rr(-38, -92, 76, 92, 6), {fill: PAPER}], [rr(-28, -82, 56, 62, 3), {w: 4.5}],
  ['M-28 -12 L-36 0 M28 -12 L36 0', {w: 4.5}],
], at);

export const windowFrame = (at: At, night = false) => parts([
  [rr(-110, -170, 220, 170, 8), night ? {} : {}], [rr(-96, -156, 192, 142, 4), {w: 4.5}],
  ['M0 -156 L0 -14 M-96 -85 L96 -85', {w: 4.5}],
], at);

export const moon = (x: number, y: number, s = 1): DrawItem => ({d: place('M10 -26 A28 28 0 1 0 10 26 A22 22 0 1 1 10 -26 Z', {x, y, s}), color: AMBER, fill: LIGHT, w: 5});

export const clock = (x: number, y: number, s = 1, h = 1, m = 0): DrawItem[] => {
  const ha = ((h % 12) / 12 + m / 720) * Math.PI * 2 - Math.PI / 2;
  const ma = (m / 60) * Math.PI * 2 - Math.PI / 2;
  return [
    {d: place(circ(0, 0, 44), {x, y, s}), fill: PAPER},
    {d: place(`M0 0 L${Math.cos(ha) * 22} ${Math.sin(ha) * 22} M0 0 L${Math.cos(ma) * 32} ${Math.sin(ma) * 32}`, {x, y, s}), w: 5},
  ];
};

export {ellipse};
