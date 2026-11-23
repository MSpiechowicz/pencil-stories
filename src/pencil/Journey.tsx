// Renders the single long page: paper, everything drawn so far, the pencil, and the camera.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {pencilAt, progressOf, textWidth, type Slot} from './draw';
import {INK, PAPER} from './art';
import {HAND_FONT} from './fonts';
import {FILMS, TITLE_IN, ZOOM_FRAMES, type Variant} from './plan';
import {Soundtrack} from './Soundtrack';
import {HOOK_H, HookOnPage} from './Hook';

const W = 1080;
const H = 1920;
const DESK = '#3b3430';

const PencilTip: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0 L10 -26 L26 -20 Z" fill="#e8c9a0" />
    <path d="M0 0 L4 -10 L10 -8 Z" fill={INK} />
    <path d="M10 -26 L70 -176 L86 -170 L26 -20 Z" fill="#f2b33d" />
    <path d="M70 -176 L78 -196 L94 -190 L86 -170 Z" fill="#d87a8a" />
    <path d="M10 -26 L70 -176" stroke="#d99a2b" strokeWidth={3} />
  </g>
);

export const Strokes: React.FC<{frame: number; slots: Slot[]}> = ({frame, slots}) => (
  <>
    {slots.map((s) => {
      if (frame < s.start) return null;
      const p = progressOf(s, frame);
      const it = s.item;
      const color = it.color ?? INK;
      if (it.text !== undefined) {
        const size = it.size ?? 56;
        const cid = `t${s.i}`;
        const w = textWidth(it) * 1.25 + 40;
        return (
          <g key={s.i}>
            <clipPath id={cid}>
              <rect x={s.x0 - 20 - (it.center ? textWidth(it) * 0.125 : 0)} y={it.y! - size * 1.25} width={w * p} height={size * 1.75} />
            </clipPath>
            <text x={it.x} y={it.y} textAnchor={it.center ? 'middle' : 'start'} fontFamily={HAND_FONT} fontWeight={it.weight ?? 700} fontSize={size} fill={color} clipPath={`url(#${cid})`}>
              {it.text}
            </text>
          </g>
        );
      }
      const done = p >= 1;
      const dash = done ? null : evolvePath(p, it.d!);
      const common = {
        d: it.d,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        strokeDasharray: dash?.strokeDasharray,
        strokeDashoffset: dash?.strokeDashoffset,
        opacity: it.opacity ?? 1,
      };
      if (it.tube) {
        return (
          <g key={s.i}>
            <path {...common} fill="none" stroke={color} strokeWidth={it.tube} />
            <path {...common} fill="none" stroke={it.inner ?? PAPER} strokeWidth={Math.max(1, it.tube - 2 * (it.w ?? 5))} />
          </g>
        );
      }
      return (
        it.clip ? (
          <g key={s.i}>
            <clipPath id={`clip${s.i}`}><path d={it.clip} /></clipPath>
            <path {...common} fill="none" stroke={color} strokeWidth={it.w ?? 6.5} clipPath={`url(#clip${s.i})`} />
          </g>
        ) :
        <path key={s.i} {...common} fill={done && it.fill ? it.fill : 'none'} fillOpacity={it.fillOpacity ?? 1}
          stroke={color} strokeWidth={it.w ?? 6.5} />
      );
    })}
  </>
);

export const Journey: React.FC<{variant: Variant}> = ({variant}) => {
  const film = FILMS[variant];
  const {PLAN, CAMERA, OUTRO_START, WORLD_H} = film;
  const frame = useCurrentFrame();
  const cam = CAMERA[Math.min(frame, CAMERA.length - 1)];
  // final pull-back that reveals the whole journey
  const z = interpolate(frame, [OUTRO_START, OUTRO_START + ZOOM_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
  });
  const fullH = WORLD_H + 160;
  const fullW = (fullH * W) / H;
  const vbH = H + (fullH - H) * z;
  const vbW = W + (fullW - W) * z;
  const vbX = (W - vbW) / 2;
  const vbY = cam + (-80 - cam) * z;
  const pt = pencilAt(PLAN.slots, frame, {x: 1250, y: cam + 1700 - HOOK_H});
  const titleIn = interpolate(frame, [OUTRO_START + TITLE_IN - 4, OUTRO_START + TITLE_IN + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subIn = interpolate(frame, [OUTRO_START + 110, OUTRO_START + 140], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: DESK}}>
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="rules" width={W} height={72} patternUnits="userSpaceOnUse">
            <rect width={W} height={72} fill={PAPER} />
            <rect y={70} width={W} height={2} fill="#c3d3e8" />
          </pattern>
          <pattern id="grain" width={512} height={512} patternUnits="userSpaceOnUse">
            <image href={staticFile('paper-grain.png')} width={512} height={512} />
          </pattern>
          <filter id="page-shadow" x="-10%" y="-1%" width="120%" height="102%">
            <feDropShadow dx="0" dy="0" stdDeviation="30" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x={0} y={-200} width={W} height={WORLD_H + 400} fill="url(#rules)" filter={z > 0 ? 'url(#page-shadow)' : undefined} />
        <rect x={0} y={-200} width={W} height={WORLD_H + 400} fill="url(#grain)" opacity={0.06} style={{mixBlendMode: 'multiply'}} />
        <rect x={96} y={-200} width={3} height={WORLD_H + 400} fill="#e3989b" />
        <HookOnPage frame={frame} hook={film.def.hook} />
        <g transform={`translate(0 ${HOOK_H})`}>
          <Strokes frame={frame} slots={PLAN.slots} />
          {pt && z === 0 && <PencilTip x={pt.x} y={pt.y} />}
        </g>
      </svg>
      <AbsoluteFill style={{background: `rgba(20,18,17,${0.55 * titleIn})`}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30}}>
        <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: 170, color: PAPER, opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30}px)`}}>Keep going.</div>
        <div style={{fontFamily: HAND_FONT, fontWeight: 500, fontSize: 58, color: '#f2c36b', opacity: subIn, textAlign: 'center'}}>
          Follow for one reason a day<br />to keep going.
        </div>
      </AbsoluteFill>
      <Soundtrack film={film} />
    </AbsoluteFill>
  );
};

/** Debug: the whole finished page in one tall still (npx remotion still PagePreview). */
export const PagePreview: React.FC<{variant: Variant}> = ({variant}) => {
  const {PLAN, WORLD_H} = FILMS[variant];
  return (
  <AbsoluteFill style={{background: PAPER}}>
    <svg viewBox={`0 0 ${W} ${WORLD_H}`} width={W} height={WORLD_H}>
      <rect width={W} height={WORLD_H} fill={PAPER} />
      <rect x={96} width={3} height={WORLD_H} fill="#e3989b" />
      <Strokes frame={999999} slots={PLAN.slots} />
    </svg>
  </AbsoluteFill>
  );
};
