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

const Ink: React.FC<{w: number; h: number; items: DrawItem[]; transform?: string}> = ({w, h, items, transform}) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{position: 'absolute', inset: 0}}>
    <g transform={transform}>
      <Strokes frame={0} slots={staticSlots(items)} />
    </g>
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
  // fit inside the platforms' circle crop with room to spare: the drawing (centre ~392,427,
  // reach ~420 px) is scaled to reach ~330 px around the circle's centre
  const fit = 'translate(400 400) scale(0.78) translate(-392 -427)';
  return (
    <Paper ruleGap={64} margin={null}>
      <Ink w={800} h={800} items={items} transform={fit} />
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
  // YouTube shows different parts of the banner per device:
  //   TV: everything · desktop: the middle band (y 508..931, full width) · phones: centre 1546 x 423
  // so every drawing lives inside the desktop band; the name sits in the phone-safe centre.
  const G = 862; // ground line for both scenes
  const RAIL_Y = 905;
  const RAIL = `M60 ${RAIL_Y + 4} C500 ${RAIL_Y - 14} 900 ${RAIL_Y + 18} 1280 ${RAIL_Y + 2} C1660 ${RAIL_Y - 14} 2100 ${RAIL_Y + 16} 2440 ${RAIL_Y}`;
  const onRail = (x: number) => {
    const len = getLength(RAIL);
    let best = {x: 0, y: 0};
    for (let k = 0; k <= 600; k++) {
      const p = getPointAtLength(RAIL, (len * k) / 600);
      if (p && Math.abs(p.x - x) < Math.abs(best.x - x)) best = {x: p.x, y: p.y};
    }
    return best.y;
  };
  // left: the desk (desktop-only zone)
  const s = 0.5;
  const f = s / 0.62; // leg/chair offsets were designed at scale 0.62
  const px = 210;
  const top = G - DESK_TOP * s;
  const personY = top + 98 * s;
  const slabBottom = top + 22 * s;
  const shoe = 'M-6 -7 C-6 -16 22 -16 32 -5 C34 2 28 6 -6 6 Z';
  const items: DrawItem[] = [
    {d: RAIL, w: 8},
    ...[200, 640, 1280, 1880, 2290].map((x, k): DrawItem => {
      const red = k === 4;
      return {d: circ(x, onRail(x), 12), fill: red ? RED : INK, color: red ? RED : INK, w: 5};
    }),
    {d: `M60 ${G} L460 ${G}`},
    ...chairBackrest({x: px, y: personY - 92 * s, s}),
    {d: `M${px} ${slabBottom + 26 * f} L${px} ${G - 20 * f} M${px - 62 * f} ${G - 20 * f} L${px + 62 * f} ${G - 20 * f}`, w: 5},
    {d: `${circ(px - 62 * f, G - 10 * f, 8 * f)} ${circ(px + 62 * f, G - 10 * f, 8 * f)}`, w: 4, fill: PAPER},
    {d: `M${px - 12 * f} ${slabBottom + 2} L${px - 24 * f} ${slabBottom + 30 * f} L${px - 32 * f} ${G - 9 * f} M${px + 12 * f} ${slabBottom + 2} L${px + 24 * f} ${slabBottom + 30 * f} L${px + 32 * f} ${G - 9 * f}`, w: 6},
    {d: `${place(shoe, {x: px - 30 * f, y: G - 6 * f, s: 0.62 * f, flip: true})} ${place(shoe, {x: px + 30 * f, y: G - 6 * f, s: 0.62 * f})}`, fill: PAPER, w: 4},
    ...stick({x: px, y: personY, s, pose: 'atDesk', mood: 'smile', tie: true}),
    ...desk({x: 260, y: G, s}),
    ...laptopBack({x: px, y: top, s: 0.36}),
    // right: home — his wife and daughter wait for him; the pencil draws the line to them
    // (kept right of x 2053 so phones, which show only the centre, don't get half a family)
    {d: `M2066 ${G} L2400 ${G}`},
    ...stick({x: 2088, y: G, s: 0.42, pose: 'cheer', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'grin'}),
    ...stick({x: 2150, y: G, s: 0.42, pose: 'cheer', hair: 'long', skirt: true, color: RED, mood: 'grin'}),
    ...house({x: 2305, y: G, s: 0.4}, true),
    heart(2118, 656, 0.7),
    ...sun(2440, 590, 24),
    ...pencil(2440, RAIL_Y, -68, 0.4),
  ];
  return (
    <Paper ruleGap={80} margin={140}>
      <Ink w={2560} h={1440} items={items} />
      <AbsoluteFill style={{alignItems: 'center', top: 548}}>
        <Wordmark size={220} tagline="Hand-drawn stories that keep you going." />
      </AbsoluteFill>
    </Paper>
  );
};

export {AMBER, LIGHT};
