// Renders the single long page: paper, everything drawn so far, the pencil, and the camera.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {evolvePath, getLength} from '@remotion/paths';
import {pencilAt, progressOf, textWidth, type Slot} from './draw';
import {INK, PAPER} from './art';
import {HAND_FONT} from './fonts';
import {FILMS, TITLE_IN, WIDE, ZOOM_FRAMES, type Variant} from './plan';
import {Soundtrack} from './Soundtrack';
import {HOOK_H, HookOnPage} from './Hook';

const W = 1080;
const H = 1920;
const DESK = '#3b3430';

export const PencilTip: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0 L10 -26 L26 -20 Z" fill="#e8c9a0" />
    <path d="M0 0 L4 -10 L10 -8 Z" fill={INK} />
    <path d="M10 -26 L70 -176 L86 -170 L26 -20 Z" fill="#f2b33d" />
    <path d="M70 -176 L78 -196 L94 -190 L86 -170 Z" fill="#d87a8a" />
    <path d="M10 -26 L70 -176" stroke="#d99a2b" strokeWidth={3} />
  </g>
);

/**
 * A path made of several pieces (M ... M ...) is drawn piece after piece. The browser restarts a
 * dash pattern at every piece, so one dash over the whole path would reveal all the pieces at once,
 * ahead of the pencil; each piece gets its own dash instead, in step with the pencil.
 */
const PIECES = new Map<string, {d: string; a: number; b: number}[]>();
const piecesOf = (d: string) => {
  let out = PIECES.get(d);
  if (!out) {
    const subs = d.split(/(?=M)/).map((x) => x.trim()).filter(Boolean);
    let at = 0;
    out = subs.map((sd) => { const len = getLength(sd); const r = {d: sd, a: at, b: at + len}; at += len; return r; });
    PIECES.set(d, out);
  }
  return out;
};

/** frames a shape's fill takes to fade in after its outline is closed */
const FILL_FADE = 8;

/** `idPrefix`: keeps clip ids unique when the same strokes are drawn twice in one SVG (book pages) */
export const Strokes: React.FC<{frame: number; slots: Slot[]; idPrefix?: string}> = ({frame, slots, idPrefix = ''}) => (
  <>
    {slots.map((s) => {
      if (frame < s.start) return null;
      const p = progressOf(s, frame);
      const it = s.item;
      const color = it.color ?? INK;
      if (it.text !== undefined) {
        const size = it.size ?? 56;
        const cid = `${idPrefix}t${s.i}`;
        const w = textWidth(it) * 1.25 + 40;
        const turn = it.rot ? `rotate(${it.rot} ${it.pivot?.x ?? it.x} ${it.pivot?.y ?? it.y})` : undefined;
        return (
          <g key={s.i} transform={turn}>
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
      const pieces = !done && !it.tube && !it.clip ? piecesOf(it.d!) : null;
      if (pieces && pieces.length > 1) {
        const total = pieces[pieces.length - 1].b;
        const at = p * total;
        return (
          <g key={s.i} opacity={it.opacity ?? 1}>
            {pieces.map((pc, k) => {
              if (at <= pc.a || pc.b <= pc.a) return null;
              const local = Math.min(1, (at - pc.a) / (pc.b - pc.a));
              const dsh = local >= 1 ? null : evolvePath(local, pc.d);
              return <path key={k} d={pc.d} fill="none" stroke={color} strokeWidth={it.w ?? 6.5} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={dsh?.strokeDasharray} strokeDashoffset={dsh?.strokeDashoffset} />;
            })}
          </g>
        );
      }
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
            <clipPath id={`${idPrefix}clip${s.i}`}><path d={it.clip} /></clipPath>
            <path {...common} fill="none" stroke={color} strokeWidth={it.w ?? 6.5} clipPath={`url(#${idPrefix}clip${s.i})`} />
          </g>
        ) :
        <path key={s.i} {...common} fill={done && it.fill ? it.fill : 'none'}
          fillOpacity={(it.fillOpacity ?? 1) * Math.min(1, Math.max(0, (frame - s.end) / FILL_FADE))}
          stroke={color} strokeWidth={it.w ?? 6.5} />
      );
    })}
  </>
);

/**
 * Screen layouts. 'tall' is the 9:16 phone video: the page fills the screen.
 * 'wide' is 16:9 for desktop / TV: the paper fills the whole screen and the story is drawn in a
 * centred column, followed by its own camera planned for the shorter frame (see WIDE in plan.ts).
 */
/** 'tall2k': the phone video at 1440x2560 (YouTube Shorts) - the same framing, drawn sharper */
export type Layout = 'tall' | 'tall2k' | 'wide';
// (a function, not a constant: plan.ts and this file import each other)
const layoutOf = (layout: Layout) =>
  layout === 'wide' ? {w: WIDE.w, h: WIDE.h, s: WIDE.scale} : layout === 'tall2k' ? {w: 1440, h: 2560, s: 1440 / W} : {w: W, h: H, s: 1};

export const Journey: React.FC<{variant: Variant; layout?: Layout}> = ({variant, layout = 'tall'}) => {
  const L = layoutOf(layout);
  const wide = layout === 'wide';
  const VW = L.w / L.s; // visible page width / height in page units
  const VH = L.h / L.s;
  const ui = wide ? L.h / 1080 : L.w / W; // title text sized for the frame
  const film = FILMS[variant];
  const {PLAN, CAMERA, OUTRO_START, WORLD_H} = film;
  const frame = useCurrentFrame();
  const camera = wide ? film.CAMERA_WIDE : CAMERA;
  // whole SCREEN pixels: the camera is planned in page units, and at the wide video's 0.93 scale a
  // page unit is not a pixel, so lines would step by 0 or 1 pixel in a rhythm (a wavy shimmer)
  const snap = (v: number) => Math.round(v * L.s) / L.s;
  const top = snap(camera[Math.min(frame, camera.length - 1)]);
  // final pull-back that reveals the whole journey
  const z = interpolate(frame, [OUTRO_START, OUTRO_START + ZOOM_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
  });
  const fullH = WORLD_H + 160;
  const fullW = (fullH * VW) / VH;
  const vbH = VH + (fullH - VH) * z;
  const vbW = VW + (fullW - VW) * z;
  // the drawings span page x ~139..983: in the wide video they are centred on screen by that span
  const cx = wide ? 561 : W / 2;
  const vbX = z === 0 ? snap(cx - vbW / 2) : cx - vbW / 2;
  // notebook margin line: at the page's left edge in the phone video; in the wide video at the
  // same proportion (~9%) from the left edge of the screen, like a real notebook page
  // (pinned to the screen, also while the camera pulls back at the end, at a constant thickness)
  const marginX = wide ? vbX + (96 / W) * vbW : 96;
  const marginW = wide ? (3 * vbW) / VW : 3;
  const vbY = top + (-80 - top) * z;
  // paper: one page in the tall video; in the wide one it runs past both screen edges
  const px0 = wide ? -20000 : 0;
  const pw = wide ? W + 40000 : W;
  const pt = pencilAt(PLAN.slots, frame, {x: 1250, y: top + VH - 220 - HOOK_H});
  const titleIn = interpolate(frame, [OUTRO_START + TITLE_IN - 4, OUTRO_START + TITLE_IN + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subIn = interpolate(frame, [OUTRO_START + 110, OUTRO_START + 140], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: DESK}}>
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width={L.w} height={L.h} style={{position: 'absolute', inset: 0}}>
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
        <rect x={px0} y={-200} width={pw} height={WORLD_H + 400} fill="url(#rules)" filter={z > 0 && !wide ? 'url(#page-shadow)' : undefined} />
        <rect x={px0} y={-200} width={pw} height={WORLD_H + 400} fill="url(#grain)" opacity={0.06} style={{mixBlendMode: 'multiply'}} />
        <rect x={marginX} y={-200} width={marginW} height={WORLD_H + 400} fill="#e3989b" />
        <HookOnPage frame={frame} hook={film.def.hook} />
        <g transform={`translate(0 ${HOOK_H})`}>
          <Strokes frame={frame} slots={PLAN.slots} />
          {pt && z === 0 && <PencilTip x={pt.x} y={pt.y} />}
        </g>
      </svg>
      <AbsoluteFill style={{background: `rgba(20,18,17,${0.55 * titleIn})`}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30 * ui}}>
        <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: 170 * ui, color: PAPER, opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30 * ui}px)`}}>Keep going.</div>
        <div style={{fontFamily: HAND_FONT, fontWeight: 500, fontSize: 58 * ui, color: '#f2c36b', opacity: subIn, textAlign: 'center'}}>
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
