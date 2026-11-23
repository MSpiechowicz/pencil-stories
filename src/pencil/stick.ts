// Ink-cartoon stick figures: big round head, expressive face, single-line body,
// mitten hands, outlined shoes. Drawn by the pencil in a natural order:
// head → face → hair → body → arms → hands → legs → shoes.
import type {DrawItem, Pt} from './draw';
import {circ, ellipse, place, rr} from './geo';
import {INK, PAPER, RED} from './art';

const P = (x: number, y: number): Pt => ({x, y});
type Limb = [Pt, Pt, Pt]; // shoulder/hip → elbow/knee → hand/foot

type Pose = {
  side: boolean;
  neck: Pt; // bottom of the head / top of the body line
  hip: Pt;
  armB: Limb; armF: Limb;
  legB?: Limb; legF?: Limb;
  headOffset?: Pt; // head centre relative to neck (default straight up)
};

const S = (n: Pt) => P(n.x, n.y + 14);
const mk = (neck: Pt, hip: Pt, armB: [Pt, Pt], armF: [Pt, Pt], legB?: [Pt, Pt], legF?: [Pt, Pt], side = false, headOffset?: Pt): Pose => ({
  side, neck, hip, headOffset,
  armB: [S(neck), ...armB], armF: [S(neck), ...armF],
  legB: legB && [hip, ...legB], legF: legF && [hip, ...legF],
});

const N = P(0, -235);
const H = P(0, -125);
const LEGS: [[Pt, Pt], [Pt, Pt]] = [[P(-16, -62), P(-24, -8)], [P(16, -62), P(24, -8)]];

export const STICK_POSES = {
  stand: mk(N, H, [P(-36, -172), P(-48, -122)], [P(36, -172), P(48, -122)], ...LEGS),
  handOnHip: mk(N, H, [P(-36, -172), P(-48, -122)], [P(46, -182), P(16, -134)], ...LEGS),
  cheer: mk(N, H, [P(-52, -262), P(-66, -318)], [P(52, -262), P(66, -318)], [P(-22, -62), P(-34, -8)], [P(22, -62), P(34, -8)]),
  despair: mk(N, H, [P(-60, -250), P(-44, -292)], [P(60, -250), P(44, -292)], ...LEGS),
  holdHands: mk(N, H, [P(-48, -190), P(-80, -164)], [P(48, -190), P(80, -164)], ...LEGS),
  holdFamily: mk(N, H, [P(-48, -190), P(-80, -164)], [P(46, -172), P(70, -114)], ...LEGS),
  reachUp: mk(N, H, [P(-50, -205), P(-86, -193)], [P(36, -172), P(48, -122)], ...LEGS),
  hug: mk(N, H, [P(-56, -214), P(-96, -206)], [P(56, -214), P(96, -206)], ...LEGS),
  atDesk: mk(N, P(0, -140), [P(-52, -176), P(-30, -150)], [P(52, -176), P(30, -150)]),
  walk: mk(P(6, -235), H, [P(-14, -180), P(-30, -134)], [P(24, -182), P(36, -138)], [P(-14, -64), P(-34, -8)], [P(18, -64), P(32, -6)], true),
  carry: mk(P(4, -235), H, [P(30, -190), P(70, -176)], [P(36, -186), P(76, -170)], [P(-14, -64), P(-30, -8)], [P(18, -64), P(30, -6)], true),
  run: mk(P(22, -232), P(0, -128), [P(-22, -196), P(-52, -176)], [P(50, -200), P(68, -230)], [P(-40, -80), P(-88, -66)], [P(52, -92), P(44, -6)], true),
  // defeated: sitting on the floor against a wall, legs stretched out, arms limp, head hanging
  slump: mk(P(6, -124), P(0, -14), [P(14, -68), P(34, -24)], [P(22, -70), P(44, -26)], [P(70, -34), P(132, -8)], [P(80, -42), P(146, -8)], true, P(16, 16)),
} satisfies Record<string, Pose>;

export type StickMood = 'smile' | 'grin' | 'sad' | 'crushed' | 'neutral' | 'determined' | 'worried' | 'closed';

/* face parts, authored for head radius 46 centred at 0,0 */
const faceFront = (m: StickMood): {eyes: string; lines: string} => {
  const eyesOpen = `${ellipse(-15, -4, 5.5, 9)} ${ellipse(15, -4, 5.5, 9)}`;
  const closed = 'M-22 -2 Q-15 5 -8 -2 M8 -2 Q15 5 22 -2';
  switch (m) {
    case 'smile': return {eyes: eyesOpen, lines: 'M-24 -24 Q-15 -31 -6 -25 M6 -25 Q15 -31 24 -24 M-22 14 Q0 32 22 14'};
    case 'grin': return {eyes: eyesOpen, lines: 'M-24 -25 Q-15 -33 -6 -26 M6 -26 Q15 -33 24 -25 M-24 12 Q0 40 24 12 Z'};
    case 'sad': return {eyes: eyesOpen, lines: 'M-26 -20 L-7 -28 M7 -28 L26 -20 M-16 24 Q0 12 16 24'};
    case 'crushed': return {eyes: closed, lines: 'M-26 -18 L-7 -26 M7 -26 L26 -18 M-14 26 Q0 16 14 26'};
    case 'worried': return {eyes: eyesOpen, lines: 'M-25 -22 Q-16 -30 -7 -28 M7 -28 Q16 -30 25 -22 M-12 22 Q-4 18 0 22 Q4 26 12 22'};
    case 'determined': return {eyes: eyesOpen, lines: 'M-26 -28 L-7 -20 M7 -20 L26 -28 M-12 20 L12 18'};
    case 'closed': return {eyes: closed, lines: 'M-12 20 Q0 26 12 20'};
    default: return {eyes: eyesOpen, lines: 'M-24 -24 Q-15 -30 -6 -25 M6 -25 Q15 -30 24 -24 M-10 20 L10 20'};
  }
};
const faceSide = (m: StickMood): {eyes: string; lines: string} => {
  const eye = ellipse(20, -4, 5.5, 9);
  switch (m) {
    case 'smile': case 'grin': return {eyes: eye, lines: 'M10 -24 Q20 -31 30 -24 M8 16 Q24 30 40 12'};
    case 'sad': case 'crushed': return {eyes: m === 'crushed' ? '' : eye, lines: `${m === 'crushed' ? 'M12 -2 Q20 5 28 -2 ' : ''}M10 -22 L30 -28 M16 24 Q26 16 38 22`};
    case 'determined': return {eyes: eye, lines: 'M10 -28 L30 -20 M16 20 L36 18'};
    case 'closed': return {eyes: '', lines: 'M12 -2 Q20 5 28 -2 M18 20 Q26 24 34 18'};
    default: return {eyes: eye, lines: 'M10 -24 Q20 -30 30 -24 M18 20 L34 19'};
  }
};
const HAIR = 'M-8 -45 C-14 -60 -6 -68 2 -72 M2 -46 C4 -64 16 -68 24 -66 M-18 -42 C-28 -54 -26 -62 -20 -68';
const HAIR_LONG = 'M-44 -12 C-54 -66 54 -66 44 -12 C46 22 54 44 62 62 M-44 -12 C-46 22 -54 44 -62 62 M-40 -24 C-22 -42 22 -42 40 -24';
const PIGTAILS = 'M-30 -36 C-20 -48 20 -48 30 -36';

const mitten = (hand: Pt, from: Pt, s: number) => {
  const a = (Math.atan2(hand.y - from.y, hand.x - from.x) * 180) / Math.PI;
  return place(`${ellipse(6, 0, 12, 9)} M2 -8 L-4 -14`, {x: hand.x, y: hand.y, rot: a, s: Math.min(1, s * 1.15)});
};
const SHOE = 'M-6 -7 C-6 -16 22 -16 32 -5 C34 2 28 6 -6 6 Z';

export const stick = (o: {
  x: number; y: number; s?: number; pose?: keyof typeof STICK_POSES; flip?: boolean;
  color?: string; mood?: StickMood; hair?: 'tufts' | 'long' | 'pigtails' | 'none';
  tie?: boolean; badge?: boolean; skirt?: boolean; child?: boolean; speed?: number;
  /** only the head (face + hair), e.g. for the channel avatar */
  headOnly?: boolean;
}): DrawItem[] => {
  const pose: Pose = STICK_POSES[o.pose ?? 'stand'];
  const child = !!o.child;
  // children: shorter body and limbs, head almost as big
  const k = child ? 0.58 : 1;
  const s = o.s ?? 1;
  const c = o.color ?? INK;
  const W = 6.5 * Math.max(0.75, s);
  const base = {x: o.x, y: o.y, s, flip: o.flip};
  const at = (d: string) => place(d, base);
  const sc = (p: Pt) => P(p.x * k, p.y * k);
  const r = child ? 34 : 46;
  const neck = sc(pose.neck);
  const hip = sc(pose.hip);
  const head = P(neck.x + (pose.headOffset?.x ?? 0) * k, neck.y - r + (pose.headOffset?.y ?? 0) * k);
  // hair and face lines grow with the figure when it is drawn bigger than normal (avatar),
  // so they keep the same weight relative to the head outline; normal/smaller sizes are unchanged
  const up = Math.max(1, s);
  const hd = (d: string, extra: Partial<DrawItem> = {}): DrawItem => ({
    d: at(place(d, {x: head.x, y: head.y, s: r / 46, flip: false})), color: c, speed: o.speed ?? 45, ...extra,
    w: (extra.w ?? 4.5) * up,
  });
  const line = (pts: Pt[], extra: Partial<DrawItem> = {}): DrawItem => ({
    d: at(pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')), color: c, w: W, speed: o.speed, ...extra,
  });
  const out: DrawItem[] = [];

  // head and face
  if (o.hair === 'long') out.push(hd(HAIR_LONG, {w: 5}));
  out.push({d: at(circ(head.x, head.y, r)), color: c, w: W, fill: PAPER, speed: o.speed});
  const face = pose.side ? faceSide(o.mood ?? 'neutral') : faceFront(o.mood ?? 'neutral');
  if (face.eyes) out.push(hd(face.eyes, {fill: c, w: 3}));
  out.push(hd(face.lines, {w: 5, fill: o.mood === 'grin' && !pose.side ? PAPER : undefined}));
  if ((o.hair ?? 'tufts') === 'tufts') out.push(hd(HAIR, {w: 5}));
  if (o.hair === 'pigtails') {
    out.push(hd(PIGTAILS, {w: 5}), hd(`${circ(-56, -10, 12)} ${circ(56, -10, 12)}`, {w: 5}));
    out.push(hd('M-46 -22 L-38 -14 L-46 -6 Z M46 -22 L38 -14 L46 -6 Z', {color: RED, fill: RED, w: 3}));
  }

  if ((o.pose ?? 'stand') === 'slump') out.push({d: at(`M${hip.x - 26} ${hip.y + 12} Q${hip.x} ${hip.y - 8} ${hip.x + 30} ${hip.y + 12}`), color: c, w: W, speed: o.speed});
  if (o.headOnly) return out;

  // body
  const bodyTop = P(neck.x, neck.y + 2);
  out.push({d: at(`M${bodyTop.x} ${bodyTop.y} Q${(bodyTop.x + hip.x) / 2 + 3} ${(bodyTop.y + hip.y) / 2} ${hip.x} ${hip.y}`), color: c, w: W, speed: o.speed});
  if (o.tie && !pose.side) {
    out.push({d: at(`M${neck.x - 7} ${neck.y + 4} L${neck.x + 7} ${neck.y + 4} L${neck.x + 4} ${neck.y + 13} L${neck.x - 4} ${neck.y + 13} Z M${neck.x - 4} ${neck.y + 13} L${neck.x - 10} ${neck.y + 62} L${neck.x} ${neck.y + 74} L${neck.x + 10} ${neck.y + 62} L${neck.x + 4} ${neck.y + 13}`), color: RED, w: 4.5, fill: PAPER});
  }
  if (o.badge && !pose.side) out.push({d: at(rr(neck.x + 14, neck.y + 40, 18, 22, 3)), color: RED, w: 4});
  if (o.skirt) out.push({d: at(`M${neck.x - 12} ${neck.y + 52 * k} L${hip.x - 42 * k} ${hip.y + 26 * k} L${hip.x + 42 * k} ${hip.y + 26 * k} L${neck.x + 12} ${neck.y + 52 * k} Z`), color: c, w: 5, fill: PAPER});

  // arms + mitten hands
  for (const arm of [pose.armB, pose.armF]) {
    const a = arm.map(sc);
    out.push(line(a));
    out.push({d: at(mitten(a[2], a[1], 1)), color: c, w: 4.5, fill: PAPER, speed: o.speed ?? 45});
  }
  // legs + shoes
  for (const [leg, back] of [[pose.legB, true], [pose.legF, false]] as const) {
    if (!leg) continue;
    const l = leg.map(sc);
    out.push(line(l));
    const dir = pose.side ? 1 : back ? -1 : 1;
    out.push({d: at(place(SHOE, {x: l[2].x, y: l[2].y, flip: dir < 0, s: child ? 0.8 : 1})), color: c, w: 4.5, fill: PAPER, speed: o.speed ?? 45});
  }
  return out;
};

/** Small, quick crowd figure in the same ink style (2 strokes). */
export const tinyStick = (x: number, y: number, s = 0.42, color = INK, speed = 160): DrawItem[] => [
  {d: place(circ(0, -281, 46), {x, y, s}), color, w: 5, fill: PAPER, speed},
  {d: place('M0 -233 L0 -125 M0 -221 L-30 -170 L-40 -126 M0 -221 L30 -170 L40 -126 M0 -125 L-16 -62 L-26 -6 M0 -125 L16 -62 L26 -6', {x, y, s}), color, w: 5, speed},
];

/** A whole row of crowd figures as two strokes (heads, then bodies) so the pencil sweeps it quickly. */
export const crowdRow = (xs: number[], y: number, s = 0.42, color = INK, speed = 420): DrawItem[] => [
  {d: xs.map((x) => place(circ(0, -281, 46), {x, y, s})).join(' '), color, w: 5, fill: PAPER, speed},
  {d: xs.map((x) => place('M0 -233 L0 -125 M0 -221 L-30 -170 L-40 -126 M0 -221 L30 -170 L40 -126 M0 -125 L-16 -62 L-26 -6 M0 -125 L16 -62 L26 -6', {x, y, s})).join(' '), color, w: 5, speed},
];

/** Little motion / emotion marks (the curved strokes around cartoon figures). */
export const marks = (x: number, y: number, s = 1, color = INK): DrawItem => ({
  d: place('M0 0 Q-8 -10 -2 -20 M14 -4 Q10 -16 16 -26 M-14 6 Q-24 0 -26 -10', {x, y, s}), color, w: 4, speed: 50,
});

export {RED, PAPER};

/** Just the head of a standing figure, centred at (cx, cy) with head radius R — same drawing as the videos. */
export const stickHead = (cx: number, cy: number, R: number, o: {color?: string; mood?: StickMood; hair?: 'tufts' | 'long' | 'pigtails'; child?: boolean}): DrawItem[] => {
  const r = o.child ? 34 : 46;
  const k = o.child ? 0.58 : 1;
  const s = R / r;
  const localY = STICK_POSES.stand.neck.y * k - r; // head centre relative to the feet
  return stick({x: cx, y: cy - localY * s, s, color: o.color, mood: o.mood, hair: o.hair, child: o.child, headOnly: true});
};
