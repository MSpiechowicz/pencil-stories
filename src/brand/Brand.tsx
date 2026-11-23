// PencilStories brand kit — drawn with the same ink, characters and paper as the videos.
// Render: npm run brand  (writes PNGs into brand/)
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {DrawItem} from '../pencil/draw';
import {AMBER, DESK_TOP, INK, LIGHT, PAPER, RED, chairBackrest, desk, heart, house, laptopBack, sun} from '../pencil/art';
import {getLength, getPointAtLength} from '@remotion/paths';
import {stick, stickHead} from '../pencil/stick';
import {circ, place, rr} from '../pencil/geo';
import {HAND_FONT} from '../pencil/fonts';
import {Strokes} from '../pencil/Journey';
import {staticSlots} from '../pencil/Hook';

const RULE = '#c3d3e8';
const MARGIN = '#e3989b';

/** Lined notebook paper (as in the videos). `ruleGap` = distance between ruled lines. */
const Paper: React.FC<{ruleGap?: number; margin?: number | null; children?: React.ReactNode}> = ({ruleGap = 72, margin = 96, children}) => (
  <AbsoluteFill style={{
    backgroundColor: PAPER,
    backgroundImage: [
      ...(margin !== null ? [`linear-gradient(to right, transparent ${margin}px, ${MARGIN} ${margin}px, ${MARGIN} ${margin + 3}px, transparent ${margin + 3}px)`] : []),
      `repeating-linear-gradient(to bottom, transparent 0, transparent ${ruleGap - 2}px, ${RULE} ${ruleGap - 2}px, ${RULE} ${ruleGap}px)`,
    ].join(','),
  }}>{children}</AbsoluteFill>
);

const Ink: React.FC<{w: number; h: number; items: DrawItem[]}> = ({w, h, items}) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{position: 'absolute', inset: 0}}>
    <Strokes frame={0} slots={staticSlots(items)} />
  </svg>
);

/** The pencil, drawn in the video's ink style. Tip at (x, y), body rotated by `rot` degrees. */
export const pencil = (x: number, y: number, rot: number, s = 1): DrawItem[] => {
  const at = {x, y, s, rot};
  const P = (d: string) => place(d, at);
  return [
    {d: P(`${rr(110, -35, 330, 70, 6)}`), fill: '#f2b33d'},
    {d: P('M110 -12 L440 -12 M110 12 L440 12'), w: 4, color: '#c58a1c'},
    {d: P('M0 0 L110 -35 L110 35 Z'), fill: '#e8c9a0'},
    {d: P('M0 0 L34 -11 L34 11 Z'), fill: INK},
    {d: P(rr(440, -38, 46, 76, 6)), fill: '#c9cdd2'},
    {d: P('M455 -38 L455 38 M471 -38 L471 38'), w: 4},
    {d: P(rr(486, -35, 64, 70, 18)), fill: '#e98fa0'},
  ];
};

/* ======================= 1. avatar: the character's face ======================= */
export const AvatarFace: React.FC = () => {
  // the family exactly as drawn in the videos (stick.ts, same poses as the family scene),
  // holding hands; the pencil draws the ground line under them, the heart floats above
  const S = 1.45;
  const G = 690; // ground line
  const items: DrawItem[] = [
    {d: `M150 ${G + 6} L640 ${G + 6}`, w: 9},
    ...stick({x: 400 - 160 * S, y: G, s: S, pose: 'holdHands', hair: 'long', skirt: true, color: RED, mood: 'smile'}),
    ...stick({x: 400, y: G, s: S, pose: 'holdFamily', mood: 'smile'}),
    ...stick({x: 400 + 120 * S, y: G, s: S, pose: 'reachUp', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'smile'}),
    heart(286, 170, 1.5),
    ...pencil(640, G + 6, -62, 0.4),
  ];
  return (
    <Paper ruleGap={64} margin={null}>
      <Ink w={800} h={800} items={items} />
    </Paper>
  );
};

/* ============ 2. avatar: icon — a pencil finishing a heart drawn as one line ============ */
// one line that becomes a heart (centred in the circle crop)
const lifeHeart = place('M120 560 C200 560 250 520 300 470 C230 410 200 330 260 280 C320 230 390 270 400 330 C410 270 480 230 540 280 C600 330 570 410 500 470 C450 515 420 540 400 560', {x: 20, y: -20});
export const AvatarIcon: React.FC = () => (
  <Paper ruleGap={64} margin={null}>
    <Ink w={800} h={800} items={[
      {d: lifeHeart, color: RED, w: 18},
      {d: circ(140, 540, 16), color: INK, fill: INK, w: 6},
      ...pencil(420, 542, -40, 0.56),
    ]} />
  </Paper>
);

/* ================================ 3. wordmark ================================ */
const Wordmark: React.FC<{size: number; tagline?: string; color?: string}> = ({size, tagline}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.05}}>
    <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap'}}>
      <span style={{color: INK}}>Pencil</span><span style={{color: RED}}>Stories</span>
    </div>
    {tagline && <div style={{fontFamily: HAND_FONT, fontWeight: 500, fontSize: size * 0.34, color: INK, opacity: 0.85}}>{tagline}</div>}
  </div>
);

export const WordmarkLogo: React.FC = () => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Ink w={2000} h={600} items={[...pencil(1590, 420, -8, 0.5), {d: 'M330 430 C700 455 1200 410 1590 420', w: 9}]} />
    <div style={{position: 'absolute', top: 120}}><Wordmark size={250} /></div>
  </AbsoluteFill>
);

/* ===================== 4. YouTube watermark (150 x 150, transparent) ===================== */
export const Watermark: React.FC = () => (
  <AbsoluteFill>
    <svg viewBox="0 0 800 800" width={150} height={150}>
      <circle cx={400} cy={400} r={392} fill={PAPER} />
      <Strokes frame={0} slots={staticSlots([{d: lifeHeart, color: RED, w: 26}, ...pencil(420, 542, -40, 0.56)])} />
    </svg>
  </AbsoluteFill>
);

/* ===================== 5. YouTube banner (2560 x 1440) ===================== */
// Safe area visible everywhere (phones): 1546 x 423, centred → x 507..2053, y 508..931.
export const Banner: React.FC = () => {
  const G = 1150; // ground line for the little scenes left and right (outside the phone safe area)
  // the life-line rail; it ends at the pencil tip, as if the pencil is drawing it right now
  const RAIL = 'M60 1240 C500 1200 900 1270 1280 1235 C1660 1200 1980 1262 2290 1236';
  const onRail = (x: number) => {
    // y of the rail at x (sampled), so the dots sit exactly on the line
    const len = getLength(RAIL);
    let best = {x: 0, y: 0};
    for (let k = 0; k <= 600; k++) {
      const p = getPointAtLength(RAIL, (len * k) / 600);
      if (p && Math.abs(p.x - x) < Math.abs(best.x - x)) best = {x: p.x, y: p.y};
    }
    return best.y;
  };
  // the desk on the left: same seated figure as the videos, now with his chair and legs
  const s = 0.62;
  const px = 220;
  const top = G - DESK_TOP * s;
  const personY = top + 98 * s;
  const slabBottom = top + 22 * s;
  const items: DrawItem[] = [
    {d: RAIL, w: 8},
    ...[200, 640, 1280, 1880, 2160].map((x, k): DrawItem => {
      const red = k === 4;
      return {d: circ(x, onRail(x), 12), fill: red ? RED : INK, color: red ? RED : INK, w: 5};
    }),
    {d: `M60 ${G} L480 ${G}`},
    ...chairBackrest({x: px, y: personY - 92 * s, s}),
    // chair under him: one pole between his legs down to a wide base, wheels outside his feet
    {d: `M${px} ${slabBottom + 26} L${px} ${G - 20} M${px - 62} ${G - 20} L${px + 62} ${G - 20}`, w: 5},
    {d: `${circ(px - 62, G - 10, 8)} ${circ(px + 62, G - 10, 8)}`, w: 4, fill: PAPER},
    // his legs: knees just below the desk, lower legs angled slightly outward to his shoes
    {d: `M${px - 12} ${slabBottom + 2} L${px - 24} ${slabBottom + 30} L${px - 32} ${G - 9} M${px + 12} ${slabBottom + 2} L${px + 24} ${slabBottom + 30} L${px + 32} ${G - 9}`, w: 6},
    {d: `${place('M-6 -7 C-6 -16 22 -16 32 -5 C34 2 28 6 -6 6 Z', {x: px - 30, y: G - 6, s: 0.62, flip: true})} ${place('M-6 -7 C-6 -16 22 -16 32 -5 C34 2 28 6 -6 6 Z', {x: px + 30, y: G - 6, s: 0.62})}`, fill: PAPER, w: 4},
    ...stick({x: px, y: personY, s, pose: 'atDesk', mood: 'smile', tie: true}),
    ...desk({x: 280, y: G, s}),
    ...laptopBack({x: px, y: top, s: 0.45}),
    // right: where it leads — home, his wife and daughter, under the sun
    // (kept left of the pencil so it never crosses the house)
    {d: `M1880 ${G} L2330 ${G}`},
    ...house({x: 2195, y: G, s: 0.55}, true),
    // he is at his desk on the left; his wife and daughter wait for him at home
    ...stick({x: 1930, y: G, s: 0.55, pose: 'cheer', hair: 'long', skirt: true, color: RED, mood: 'grin'}),
    ...stick({x: 2015, y: G, s: 0.55, pose: 'cheer', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'grin'}),
    ...sun(2440, 760, 38),
    heart(1972, 880, 0.9),
    // the pencil drawing the rail: tip on the line's end, held up so it stays inside the banner
    ...pencil(2290, 1236, -58, 0.58),
  ];
  return (
    <Paper ruleGap={80} margin={140}>
      <Ink w={2560} h={1440} items={items} />
      <AbsoluteFill style={{alignItems: 'center', top: 560}}>
        <Wordmark size={230} tagline="Hand-drawn stories that keep you going." />
      </AbsoluteFill>
    </Paper>
  );
};

export {AMBER, LIGHT};
