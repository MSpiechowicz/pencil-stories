// Renders a story as an open sketchbook on a desk: the pencil draws on the two facing pages, and
// pages turn forward (and back) with a folding corner, a highlight along the fold and a soft
// shadow on the page underneath.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {pencilAt, type Slot} from '../pencil/draw';
import {INK, PAPER} from '../pencil/art';
import {HAND_FONT} from '../pencil/fonts';
import {PencilTip, Strokes} from '../pencil/Journey';
import {stateAt, type Schedule, type Side} from './timeline';
import {polyD, turnEase, turnGeometry} from './turn';

export const PW = 1000; // page width (book units)
export const PH = 1300; // page height
const DESK = '#3b3430';
const COVER = '#5a4336';
const RULE = '#c9d7ea';

/** 'ruled': notebook rules and a red margin; 'margin': plain paper with only the red margin;
 *  'plain': clean sketchbook paper */
export type PaperStyle = 'ruled' | 'margin' | 'plain';
/** `voice`: narration files under public/<dir>/<id>.wav, placed where the schedule put them;
 *  `outroLine` is spoken with the closing card */
export type BookFilm = {S: Schedule; spreads: number; outro: number; total: number; paper?: PaperStyle;
  voice?: {dir: string; outroLine?: string; frames?: Record<string, number>};
  /** score under public/, starting at frame 0, ducked under the narration */
  music?: string};
const PaperCtx = React.createContext<PaperStyle>('ruled');

/** The paper of one page in its own coordinates (0..PW, 0..PH): ruled, grained, with a margin. */
const Paper: React.FC = () => {
  const style = React.useContext(PaperCtx);
  return (
    <>
      <rect width={PW} height={PH} fill={style === 'ruled' ? 'url(#rules)' : PAPER} />
      <rect width={PW} height={PH} fill="url(#grain)" opacity={0.06} style={{mixBlendMode: 'multiply'}} />
      {/* red margin line near the left edge of every page, like a notebook */}
      {style !== 'plain' && <rect x={96} width={3} height={PH} fill="#e3989b" opacity={0.85} />}
    </>
  );
};

const pageX = (side: Side) => (side === 'left' ? -PW : 0);

/** One page with everything drawn on it up to `frame`, placed at its slot in the open book. */
const Page: React.FC<{side: Side; slots: Slot[]; frame: number; id: string; pencil?: boolean}> = ({side, slots, frame, id, pencil}) => {
  const pt = pencil && slots.length ? pencilAt(slots, frame, {x: PW + 420 - pageX(side), y: PH + 260}) : null;
  return (
    <g transform={`translate(${pageX(side)} 0)`}>
      <Paper />
      <Strokes frame={frame} slots={slots} idPrefix={id} />
      {pt && <PencilTip x={pt.x} y={pt.y} />}
    </g>
  );
};

/**
 * The page block under one open page: a thin even sliver of sheet edges along the outer side and
 * the bottom, part of the same book (no outlines, just paper tone and fine sheet lines). It is a
 * little thicker on the side that holds more pages (`share` 0..1), never zero on either side.
 */
const Block: React.FC<{side: Side; share: number}> = ({side, share}) => {
  const t = 9 + 10 * Math.min(1, Math.max(0, share)); // edge thickness at the outer side
  const t0 = 5; // at the spine the pages are pinched by the binding: the same on both sides
  const out = side === 'left' ? -1 : 1;
  const xo = out * PW; // outer edge of the page
  /** the bottom/outer edge of the block at depth k (0..t): it curves down from the spine, runs
   *  along the bottom and turns up round the outer corner */
  const rim = (k: number) => {
    const k0 = (t0 * k) / t;
    // the corner wraps round the page's own corner point (xo, PH): each sheet edge at depth k is a
    // quarter circle of radius k around it, so the edges meet the square page corner cleanly
    return `M0 ${PH + k0} C${xo * 0.06} ${PH + k0} ${xo * 0.14} ${PH + k} ${xo * 0.3} ${PH + k} ` +
      `L${xo} ${PH + k} A${k} ${k} 0 0 ${out > 0 ? 0 : 1} ${xo + out * k} ${PH} L${xo + out * k} ${k * 0.5 + 6}`;
  };
  const shape = `M0 0 L${xo} 0 L${xo + out * t} ${t * 0.5} L${xo + out * t} ${PH} A${t} ${t} 0 0 ${out > 0 ? 1 : 0} ${xo} ${PH + t} ` +
    `L${xo * 0.3} ${PH + t} C${xo * 0.14} ${PH + t} ${xo * 0.06} ${PH + t0} 0 ${PH + t0} Z`;
  const lines = [0.2, 0.4, 0.6, 0.8].map((q) => rim(q * t)).join(' ');
  return (
    <>
      <path d={shape} fill="#e7e0cf" />
      <path d={lines} fill="none" stroke="#cbbfa4" strokeWidth={1.4} opacity={0.8} />
      {/* soft shade where the top page meets the block */}
      <path d={`M${xo} 2 L${xo} ${PH} L0 ${PH}`} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={3} />
    </>
  );
};

/* ---------------- the vertical (Shorts / Reels) camera ---------------- */
/** Box blur with edge clamping. */
const blur = (a: number[], r: number) => a.map((_, i) => {
  let sum = 0;
  for (let k = -r; k <= r; k++) sum += a[Math.min(a.length - 1, Math.max(0, i + k))];
  return sum / (2 * r + 1);
});
const PAGE_VIEW = PW + 90; // width of the view on one page (a little paper either side)
const SPREAD_VIEW = 2 * PW + 150; // the whole open book
/**
 * For each frame: the view's centre x and width. On a page the pencil is drawing (or about to
 * draw) the camera frames that page; while pages turn it pulls back to the whole spread; the path
 * is smoothed so it glides, never jumps.
 */
const tallCamera = (S: Schedule, total: number) => {
  const cx: number[] = [];
  const w: number[] = [];
  let lastSide: Side = 'left';
  for (let f = 0; f < total; f++) {
    const st = stateAt(S, Math.min(f, S.end));
    if (st.turn || f >= S.end) {
      cx.push(0);
      w.push(SPREAD_VIEW);
      continue;
    }
    const pg = S.pages[st.spread];
    // the side of the latest stroke begun (looking slightly ahead, so the camera arrives first)
    let best = -Infinity;
    for (const side of ['left', 'right'] as const) {
      for (const sl of pg?.[side] ?? []) if (sl.start <= f + 20 && sl.start > best) { best = sl.start; lastSide = side; }
    }
    cx.push(lastSide === 'left' ? -PW / 2 : PW / 2);
    w.push(PAGE_VIEW);
  }
  return {cx: blur(blur(blur(cx, 10), 10), 10), w: blur(blur(blur(w, 10), 10), 10)};
};
const CAMERAS = new WeakMap<Schedule, ReturnType<typeof tallCamera>>();

export type BookLayout = 'wide' | 'tall';

/** Music level: one steady level under the whole film (no ducking under the voice, which only
 *  makes the music pump), faded out over the last two seconds. */
const MUSIC_LEVEL = 0.6;
const musicVolume = (film: BookFilm, f: number) =>
  MUSIC_LEVEL * interpolate(f, [film.total - 60, film.total - 2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const Book: React.FC<{film: BookFilm; outroText?: {title: string; sub?: string}; layout?: BookLayout}> = ({film, outroText, layout = 'wide'}) => {
  const {width: screenW, height: screenH} = useVideoConfig();
  const frame = useCurrentFrame();
  const {S, spreads} = film;
  const f = Math.min(frame, S.end);
  const st = stateAt(S, f);
  const get = (spread: number, side: Side) => S.pages[spread]?.[side] ?? [];
  const tr = st.turn;
  const geo = tr ? turnGeometry(turnEase(st.p), tr.dir, PW, PH) : null;
  // turn shading fades in as the sheet lifts and out as it lands, and the spine shadow on top of
  // the book fades the opposite way, so nothing pops on the first or last frame of a turn
  const k = tr && geo ? Math.min(1, 3 * Math.sin(Math.PI * Math.min(1, Math.max(0, st.p)))) : 0;

  // view: the open book centred on a 16:9 desk
  const cy = PH / 2 + 10;
  let VW = (1460 * 16) / 9;
  let VH = 1460;
  let vx = 0;
  if (layout === 'tall') {
    if (!CAMERAS.has(S)) CAMERAS.set(S, tallCamera(S, film.total));
    const cam = CAMERAS.get(S)!;
    const i = Math.min(frame, cam.cx.length - 1);
    VW = cam.w[i];
    VH = (VW * screenH) / screenW;
    vx = cam.cx[i];
  }

  // what lies where during a turn
  const a = st.spread;
  let base: React.ReactNode;
  if (!tr || !geo) {
    base = (
      <>
        <Page side="left" slots={get(a, 'left')} frame={f} id={`s${a}l`} pencil />
        <Page side="right" slots={get(a, 'right')} frame={f} id={`s${a}r`} pencil />
      </>
    );
  } else {
    const fwd = tr.dir === 1;
    const still: Side = fwd ? 'left' : 'right'; // the page that does not move
    const moving: Side = fwd ? 'right' : 'left';
    const backSide: Side = fwd ? 'left' : 'right'; // where the sheet's back ends up
    base = (
      <>
        <Page side={still} slots={get(tr.from, still)} frame={f} id={`s${tr.from}${still[0]}`} />
        {/* revealed underneath: the next spread's page on the moving side */}
        <Page side={moving} slots={get(tr.to, moving)} frame={f} id={`s${tr.to}${moving[0]}u`} />
        {/* shadow of the lifted sheet on the revealed page */}
        <path d={polyD(geo.flat.length ? sheetRect(moving) : [])} fill="url(#under-shadow)" clipPath="url(#reveal-clip)" opacity={k} />
        <clipPath id="reveal-clip"><path d={polyD(sheetRect(moving))} /></clipPath>
        {/* the part of the sheet still flat */}
        <clipPath id="flat-clip"><path d={polyD(geo.flat)} /></clipPath>
        <g clipPath="url(#flat-clip)">
          <Page side={moving} slots={get(tr.from, moving)} frame={f} id={`s${tr.from}${moving[0]}`} />
        </g>
        {/* under the flap; together with the fading one on top it adds up to the usual shadow */}
        <SpineShade opacity={k} />
        {/* the folded flap: its back is the next spread's page on the other side */}
        <path d={polyD(geo.flap)} fill="#000" opacity={(tr.pages > 1 ? 0.34 : 0.22) * k} filter="url(#flap-shadow)" />
        {/* a block of pages turned together: its thickness shows as stacked sheet edges under the flap */}
        {tr.pages > 1 && Array.from({length: Math.min(8, tr.pages + 2)}, (_, i) => {
          const o = (Math.min(8, tr.pages + 2) - i) * 3.2;
          return <path key={i} d={polyD(geo.flap)} transform={`translate(${-geo.n.x * o} ${-geo.n.y * o + o * 0.35})`}
            fill={i % 2 ? '#efeadd' : '#e4ddcc'} stroke="#cbbfa4" strokeWidth={1.4} opacity={k} />;
        })}
        <clipPath id="flap-clip"><path d={polyD(geo.flap)} /></clipPath>
        <g clipPath="url(#flap-clip)">
          <g transform={geo.backMatrix}>
            <Page side={backSide} slots={get(tr.to, backSide)} frame={f} id={`s${tr.to}${backSide[0]}b`} />
          </g>
          <path d={polyD(geo.flap)} fill="url(#flap-shade)" opacity={k} />
        </g>
        <defs>
          <linearGradient id="under-shadow" gradientUnits="userSpaceOnUse"
            x1={geo.fold.x} y1={geo.fold.y} x2={geo.fold.x + geo.n.x * 260} y2={geo.fold.y + geo.n.y * 260}>
            <stop offset="0" stopColor="#000" stopOpacity={0.32} />
            <stop offset="0.35" stopColor="#000" stopOpacity={0.1} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="flap-shade" gradientUnits="userSpaceOnUse"
            x1={geo.fold.x} y1={geo.fold.y} x2={geo.fold.x - geo.n.x * 600} y2={geo.fold.y - geo.n.y * 600}>
            <stop offset="0" stopColor="#000" stopOpacity={0.16} />
            <stop offset="0.06" stopColor="#fff" stopOpacity={0.35} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={0.05} />
            <stop offset="1" stopColor="#000" stopOpacity={0.08} />
          </linearGradient>
        </defs>
      </>
    );
  }

  // pages lying on the left: while a sheet (or a whole block) is in the air they move across with
  // it, so the stacks change thickness gradually, never in one jump
  const leftPages = tr ? tr.from + (tr.to - tr.from) * turnEase(st.p) : a;
  const outroIn = interpolate(frame, [S.end, S.end + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subIn = interpolate(frame, [S.end + 45, S.end + 75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <PaperCtx.Provider value={film.paper ?? 'ruled'}>
    <AbsoluteFill style={{background: DESK}}>
      <svg viewBox={`${vx - VW / 2} ${cy - VH / 2} ${VW} ${VH}`} width="100%" height="100%" style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="rules" width={PW} height={72} patternUnits="userSpaceOnUse" y={14}>
            <rect width={PW} height={72} fill={PAPER} />
            <rect y={70} width={PW} height={2} fill={RULE} />
          </pattern>
          <pattern id="grain" width={512} height={512} patternUnits="userSpaceOnUse">
            <image href={staticFile('paper-grain.png')} width={512} height={512} />
          </pattern>
          <filter id="flap-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={18} />
          </filter>
          <filter id="book-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx={0} dy={18} stdDeviation={28} floodColor="#000" floodOpacity={0.5} />
          </filter>
          <linearGradient id="spine" x1="0" x2="1">
            {SPINE_SHADOW.map(([o, a], i) => <stop key={i} offset={o} stopColor={SPINE_TONE} stopOpacity={a} />)}
          </linearGradient>
        </defs>
        {/* cover board and page stacks */}
        <rect x={-PW - 52} y={-30} width={2 * PW + 104} height={PH + 82} rx={20} fill={COVER} filter="url(#book-shadow)" />
        <Block side="left" share={leftPages / Math.max(1, spreads - 1)} />
        <Block side="right" share={1 - leftPages / Math.max(1, spreads - 1)} />
        {base}
        {k < 1 && <SpineShade opacity={1 - k} />}
      </svg>
      {outroText && (
        <>
          <AbsoluteFill style={{background: `rgba(20,18,17,${0.6 * outroIn})`}} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40}}>
            <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: Math.min(screenW, screenH) * 0.16, color: PAPER, opacity: outroIn,
              transform: `translateY(${(1 - outroIn) * 30}px)`}}>{outroText.title}</div>
            {outroText.sub && (
              <div style={{fontFamily: HAND_FONT, fontWeight: 500, fontSize: Math.min(screenW, screenH) * 0.053, color: '#f2c36b', opacity: subIn, textAlign: 'center'}}>
                {outroText.sub}
              </div>
            )}
          </AbsoluteFill>
        </>
      )}
      {film.voice && S.lines.map((l) => (
        <Sequence key={l.id} from={l.start} layout="none">
          <Audio src={staticFile(`${film.voice!.dir}/${l.id}.wav`)} />
        </Sequence>
      ))}
      {film.music && <Audio src={staticFile(film.music)} volume={(f) => musicVolume(film, f)} />}
      {film.voice?.outroLine && (
        <Sequence from={S.end + 34} layout="none">
          <Audio src={staticFile(`${film.voice.dir}/${film.voice.outroLine}.wav`)} />
        </Sequence>
      )}
    </AbsoluteFill>
    </PaperCtx.Provider>
  );
};

const sheetRect = (side: Side) => {
  const x0 = pageX(side);
  return [{x: x0, y: 0}, {x: x0 + PW, y: 0}, {x: x0 + PW, y: PH}, {x: x0, y: PH}];
};

/**
 * The gutter, as in a photographed open book: each page curves gently down towards the binding,
 * so a very wide, very light shade spans the inner third of the page; only the last few
 * millimetres darken, and the pages meet in one crisp thin line. Neutral warm grey, low opacity,
 * many stops: it reads as the paper turning away from the light, never as a dirty band.
 */
const SPINE_W = 330; // half width of the gutter, book units (a third of the page)
const SPINE_TONE = '#5b5046';
const SPINE_SHADOW: [number, number][] = Array.from({length: 61}, (_, i) => {
  const t = i / 60;
  const d = Math.abs(t - 0.5) * 2; // 0 at the binding, 1 at the gutter edge
  // a long soft curve plus a short steep fall-off right at the binding
  return [t, 0.1 * (1 - d) ** 2 + 0.16 * Math.exp(-d / 0.045)];
});
const SpineShade: React.FC<{opacity?: number}> = ({opacity = 1}) => (
  <g opacity={opacity}>
    <rect x={-SPINE_W} y={0} width={2 * SPINE_W} height={PH} fill="url(#spine)" />
    <rect x={-1} y={0} width={2} height={PH} fill={SPINE_TONE} opacity={0.45} />
  </g>
);

export {INK};
