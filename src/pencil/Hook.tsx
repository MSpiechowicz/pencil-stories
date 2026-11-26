// The hook at the top of the page (first ~3 s of every version) and the cover / thumbnail stills.
// The very first frame is already complete and readable: it doubles as the Reels/Shorts cover.
// The camera then glides down the same page into Year 1.
import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';

import {textWidth, type DrawItem, type Slot} from './draw';
import {INK, PAPER, RED, box, heart} from './art';
import {marks, stick} from './stick';
import {HAND_FONT} from './fonts';
import {Strokes} from './Journey';

/** Items shown fully drawn (no pencil animation). */
export const staticSlots = (items: DrawItem[]): Slot[] =>
  items.map((item, i) => {
    // a centred text starts half its width left of x, as in plan()
    const x0 = item.center ? (item.x ?? 0) - textWidth(item) / 2 : item.x ?? 0;
    // long finished, so fills that fade in after their stroke are fully in
    return {item, i, start: -40, end: -30, len: 1, p0: {x: 0, y: 0}, p1: {x: 0, y: 0}, x0, x1: x0};
  });

const PAPER_BG: React.CSSProperties = {
  backgroundColor: PAPER,
  backgroundImage: 'linear-gradient(to right, transparent 96px, #e3989b 96px, #e3989b 99px, transparent 99px), repeating-linear-gradient(to bottom, transparent 0, transparent 70px, #c3d3e8 70px, #c3d3e8 72px)',
};

/** The broken man and his box: the most recognisable image of the story. */
const scene = (x: number, ground: number, s: number): DrawItem[] => [
  {d: `M${x - 330 * s} ${ground} L${x + 330 * s} ${ground}`},
  ...box({x: x - 140 * s, y: ground, s}),
  ...stick({x: x + 210 * s, y: ground, s, mood: 'crushed'}),
  marks(x + 290 * s, ground - 350 * s, s),
];

type Hook = {lines: string[]; red: string[]};

const Title: React.FC<{hook: Hook; size: number; pop: number; align?: 'center' | 'left'}> = ({hook, size, pop, align = 'center'}) => (
  <div style={{fontFamily: HAND_FONT, fontWeight: 700, lineHeight: 0.92, textAlign: align, letterSpacing: 1}}>
    {hook.lines.map((l) => (
      <div key={l} style={{fontSize: size, color: INK}}>{l}</div>
    ))}
    {hook.red.map((l) => (
      <div key={l} style={{fontSize: size * 0.95, color: RED, transform: `scale(${pop}) rotate(${-2 * (pop - 1) * 5}deg)`,
        transformOrigin: align === 'center' ? '50% 50%' : '0 50%'}}>{l}</div>
    ))}
  </div>
);

/** Height of the hook area at the top of the page; the story starts below it. */
export const HOOK_H = 1720;
const RAIL_X = 170;

/** The hook drawn into the page itself (SVG, world coordinates 0..HOOK_H). */
export const HookOnPage: React.FC<{frame: number; hook: Hook}> = ({frame, hook}) => {
  const pop = interpolate(frame, [0, 3, 10], [1.18, 1.18, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
  const size = 210;
  let y = 470;
  const rows = [
    ...hook.lines.map((t) => ({t, color: INK, size, pop: 1})),
    ...hook.red.map((t) => ({t, color: RED, size: size * 0.95, pop})),
  ];
  return (
    <g>
      {rows.map((r) => {
        const yy = y;
        y += r.size * 0.92;
        return (
          <text key={r.t} x={560} y={yy} textAnchor="middle" fontFamily={HAND_FONT} fontWeight={700} fontSize={r.size} fill={r.color}
            transform={`translate(560 ${yy - r.size * 0.3}) scale(${r.pop}) translate(-560 ${-(yy - r.size * 0.3)})`}>{r.t}</text>
        );
      })}
      <Strokes frame={0} slots={staticSlots([
        ...scene(560, 1440, 1.2),
        // the timeline rail already runs from the hook down to Year 1
        {d: `M${RAIL_X} 1540 C${RAIL_X + 14} 1700 ${RAIL_X - 14} 1880 ${RAIL_X} ${HOOK_H + 300}`, w: 6.5},
      ])} />
    </g>
  );
};

const CoverLayout: React.FC<{hook: Hook; pop: number; tagline?: string}> = ({hook, pop, tagline}) => (
  <>
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
      <Title hook={hook} size={210} pop={pop} />
    </AbsoluteFill>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <Strokes frame={0} slots={staticSlots(scene(540, 1500, 1.25))} />
    </svg>
    {tagline && (
      <AbsoluteFill style={{alignItems: 'center', top: 1560}}>
        <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: 64, color: INK, textAlign: 'center'}}>{tagline}</div>
      </AbsoluteFill>
    )}
  </>
);

/** 9:16 cover for Shorts / Reels (key content inside Instagram's centre 3:4 grid crop). */
export const CoverVertical: React.FC<{hook: Hook}> = ({hook}) => (
  <AbsoluteFill style={PAPER_BG}>
    <CoverLayout hook={hook} pop={1} tagline="…then his daughter asked one question." />
  </AbsoluteFill>
);

/** 16:9 thumbnail for a regular YouTube upload. */
export const ThumbWide: React.FC<{hook: Hook}> = ({hook}) => (
  <AbsoluteFill style={{...PAPER_BG, backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 46px, #c3d3e8 46px, #c3d3e8 48px)'}}>
    <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 70}}>
      <Title hook={hook} size={150} pop={1} align="left" />
    </AbsoluteFill>
    <svg viewBox="0 0 1280 720" width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      <Strokes frame={0} slots={staticSlots([...scene(950, 650, 0.95), heart(1190, 120, 1)])} />
    </svg>
  </AbsoluteFill>
);
