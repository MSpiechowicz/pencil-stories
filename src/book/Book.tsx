// Renders a story as an open leather journal on a walnut desk: the pencil draws on the two facing
// pages, and pages turn forward (and back) three ways:
// - 'peel': one sheet (or a block) folding over from its corner, with a highlight along the fold
//   and a soft shadow on the page underneath;
// - 'riffle': a fast flip-through, many sheets fanning over the spine one after another;
// - 'bulk': one thick block of pages swinging over the spine.
// Light comes from the top left; everything casts its shadow down and to the right. Nothing ever
// switches on or off in one frame: a sheet lying flat looks exactly like the page under it, the
// stacks change thickness gradually, and their sheet edges fade in and out.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {pencilAt, type Slot} from '../pencil/draw';
import {INK, PAPER} from '../pencil/art';
import {HAND_FONT} from '../pencil/fonts';
import {PencilTip, Strokes} from '../pencil/Journey';
import {stateAt, tearOf, type Schedule, type Side, type Tear, type Turn} from './timeline';
import {fanSheet, polyD, riffleProgress, stackProgress, swingEase, turnEase, turnGeometry} from './turn';
import {BAND_SVG, BW, BY, DESK_DEFS, RIBBON_SVG, VIGNETTE, boardSVG, bookShadowSVG, deskSVG} from './desk';
import {awayTransform, lean, piecePath, stubPath, tearLine, tearState, tearX} from './tear';

export const PW = 1000; // page width (book units)
export const PH = 1300; // page height
const RULE = '#c9d7ea';

/** 'ruled': notebook rules and a red margin; 'margin': plain paper with only the red margin;
 *  'plain': clean sketchbook paper */
export type PaperStyle = 'ruled' | 'margin' | 'plain';
/** `voice`: narration files under public/<dir>/<id>.wav, placed where the schedule put them;
 *  `outroLine` is spoken with the closing card. `sheets`: sheets in the whole book (the page stacks'
 *  full thickness); by default a little more than the story ever has on the left. */
export type BookFilm = {S: Schedule; spreads: number; outro: number; total: number; paper?: PaperStyle; sheets?: number;
  voice?: {dir: string; outroLine?: string; frames?: Record<string, number>};
  /** score under public/, starting at frame 0, at one steady level under the narration */
  music?: string};
const PaperCtx = React.createContext<PaperStyle>('ruled');

/** Raw SVG text (the desk, the boards: fixed drawings built once) inside the scene. */
const Raw: React.FC<{svg: string}> = ({svg}) => <g dangerouslySetInnerHTML={{__html: svg}} />;
const DESK = deskSVG();
const BOARDS = boardSVG(-1) + boardSVG(1);

/**
 * The paper of one page in its own coordinates (0..PW, 0..PH): ruled or plain, grained, a red
 * margin near its OUTER edge (never against the spine), and a little shade towards the outer edge
 * where the page curves down. It is part of the page, so it turns with it.
 */
const Paper: React.FC<{side: Side}> = ({side}) => {
  const style = React.useContext(PaperCtx);
  return (
    <>
      <rect width={PW} height={PH} fill={style === 'ruled' ? 'url(#rules)' : PAPER} />
      <rect width={PW} height={PH} fill="url(#grain)" opacity={0.06} style={{mixBlendMode: 'multiply'}} />
      {style !== 'plain' && <rect x={side === 'left' ? 96 : PW - 99} width={3} height={PH} fill="#e3989b" opacity={0.85} />}
      <rect width={PW} height={PH} fill={side === 'left' ? 'url(#dk-curlL)' : 'url(#dk-curlR)'} />
    </>
  );
};

const pageX = (side: Side) => (side === 'left' ? -PW : 0);

/** A torn page's edge: a faint shadow where it lies on the page below, then rough fibres only a
 *  little lighter than the paper. sx: +1 right page, -1 left; down to yMax (as far as the rip ran). */
const TornEdge: React.FC<{sx: number; dx?: number; yMax?: number}> = ({sx, dx = 0, yMax = PH}) => {
  const line = tearLine(sx, dx, yMax);
  if (!line) return null;
  return (
    <>
      <path d={line} fill="none" stroke="#3a2a1a" strokeWidth={1.6} opacity={0.14} transform={`translate(${sx * 1.6} 1.2)`} />
      <path d={line} fill="none" stroke="#f4efe4" strokeWidth={2.2} strokeLinejoin="round" opacity={0.55} />
      <path d={tearLine(sx, dx, yMax, true)} fill="none" stroke="#ddd4c2" strokeWidth={0.9} opacity={0.6} />
    </>
  );
};

/** The stub of a page torn out: a ragged strip of paper by the spine, in book coordinates. */
const Stub: React.FC<{side: Side; id: string; under?: number; frame?: number; slots?: Slot[]; edge?: number}> = ({side, id, under = 0, frame = 0, slots = [], edge = PH}) => {
  const sx = side === 'left' ? -1 : 1;
  return (
    <>
      <clipPath id={`stub-${id}`}><path d={stubPath(sx, under)} /></clipPath>
      <g clipPath={`url(#stub-${id})`}>
        <g transform={`translate(${pageX(side)} 0)`}>
          <Paper side={side} />
          <Strokes frame={frame} slots={slots} idPrefix={`stub${id}`} />
        </g>
      </g>
      <TornEdge sx={sx} yMax={edge} />
    </>
  );
};

/** One page with everything drawn on it up to `frame`, placed at its slot in the open book.
 *  `stub`: a page torn out before it left its stub lying on this page. */
const Page: React.FC<{side: Side; slots: Slot[]; frame: number; id: string; pencil?: boolean; stub?: boolean}> = ({side, slots, frame, id, pencil, stub}) => {
  const pt = pencil && slots.length ? pencilAt(slots, frame, {x: PW + 420 - pageX(side), y: PH + 260}) : null;
  return (
    <>
      <g transform={`translate(${pageX(side)} 0)`}>
        <Paper side={side} />
        <Strokes frame={frame} slots={slots} idPrefix={id} />
      </g>
      {stub && <Stub side={side} id={id} />}
      {pt && <g transform={`translate(${pageX(side)} 0)`}><PencilTip x={pt.x} y={pt.y} /></g>}
    </>
  );
};

/* ---------------- the page stacks ---------------- */

/** a stack's edge thickness for the sheets lying on that side: 5 nearly empty, 34 holding the book */
const stackT = (sheets: number, total: number) => 5 + 29 * Math.min(1, Math.max(0, sheets / Math.max(1, total)));
const T0 = 5; // at the spine the binding pinches both stacks to the same thin edge

/** The outline of the page block under one page: pinched at the spine, curving out to its own
 *  thickness, the outer corner rounded. */
const blockShape = (side: Side, t: number) => {
  const out = side === 'left' ? -1 : 1;
  const xo = out * PW;
  return `M0 0 L${xo} 0 L${xo + out * t} ${t * 0.5} L${xo + out * t} ${PH} A${t} ${t} 0 0 ${out > 0 ? 1 : 0} ${xo} ${PH + t} ` +
    `L${xo * 0.3} ${PH + t} C${xo * 0.14} ${PH + t} ${xo * 0.06} ${PH + T0} 0 ${PH + T0} Z`;
};

/**
 * The page block under one open page: an even sliver of sheet edges along the outer side and the
 * bottom. One sheet edge every 3 units of thickness, the deepest fading in as the stack grows, so a
 * stack never gains or loses a line in one frame.
 */
const Block: React.FC<{side: Side; t: number}> = ({side, t}) => {
  const out = side === 'left' ? -1 : 1;
  const xo = out * PW;
  const rim = (k: number) => {
    const k0 = (T0 * k) / t;
    return `M0 ${PH + k0} C${xo * 0.06} ${PH + k0} ${xo * 0.14} ${PH + k} ${xo * 0.3} ${PH + k} ` +
      `L${xo} ${PH + k} A${k} ${k} 0 0 ${out > 0 ? 0 : 1} ${xo + out * k} ${PH} L${xo + out * k} ${k * 0.5 + 6}`;
  };
  const lines: React.ReactNode[] = [];
  for (let k = 3; k < t; k += 3) {
    lines.push(<path key={k} d={rim(k)} fill="none" stroke="#cbbfa4" strokeWidth={1.4} opacity={0.85 * Math.min(1, (t - k) / 3)} />);
  }
  return (
    <>
      <path d={blockShape(side, t)} fill="#e7e0cf" />
      {lines}
    </>
  );
};

/** The pages stand above the boards: the two stacks' own outlines, offset down-right and blurred. */
const StackShadow: React.FC<{tl: number; tr: number}> = ({tl, tr}) => (
  <g transform="translate(8 12)" opacity={0.55} filter="url(#dk-cast)">
    <path d={blockShape('left', tl)} fill="#120a05" />
    <path d={blockShape('right', tr)} fill="#120a05" />
  </g>
);

/** Sheets lying on the left at frame f: during a turn they move across with it, gradually. */
const sheetsAt = (S: Schedule, f: number) => {
  const st = stateAt(S, f);
  if (st.turn) {
    const tr = st.turn;
    return tr.fromSheets + (tr.toSheets - tr.fromSheets) * stackProgress(tr.kind, st.p, tr.sheets);
  }
  let n = S.arrivals[0].sheets;
  for (const a of S.arrivals) if (a.at <= f) n = a.sheets;
  return n;
};

/* ---------------- riffle and bulk ---------------- */

/** what lies on a sheet's face: the drawings of one page, or nothing (a blank sheet) */
type Face = {slots: Slot[]; id: string; stub?: boolean} | null;

/**
 * One sheet swinging about the spine at angle th. Its face is drawn with the same Page as the page
 * under it, so lying flat it is pixel for pixel that page; the gutter shade fades in as it lies
 * down, its own fold shading, edge line and cast shadow fade in as it stands up. `inner`: a sheet
 * inside a block, toned so the block's thickness shows as a band of sheet edges.
 */
const SwingSheet: React.FC<{th: number; id: string; frame: number; right: Face; left: Face; inner?: boolean}> = ({th, id, frame, right, left, inner}) => {
  const g = fanSheet(th, PW, PH);
  const face = g.side === 'right' ? right : left;
  const flat = Math.abs(g.c) ** 3;
  const edge = Math.min(1, g.steep * 4);
  const ex = g.ex || 1;
  return (
    <>
      {g.steep > 0.005 && (
        <path d={`M0 0 L${ex * 0.9} ${-30 * g.sn} L${ex * 0.9} ${PH + 30 * g.sn} L0 ${PH}Z`} fill="#2a1c10" opacity={0.22 * g.steep}
          transform={`translate(${16 * g.sn} ${20 * g.sn})`} filter="url(#dk-castWide)" />
      )}
      <defs>
        <clipPath id={`sw-${id}`}><path d={g.d} /></clipPath>
        <linearGradient id={`swf-${id}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={ex} y2={0}>
          <stop offset={0} stopColor="#000" stopOpacity={0.4 * g.steep} />
          <stop offset={0.45} stopColor="#000" stopOpacity={0.12 * g.steep} />
          <stop offset={0.8} stopColor="#fff" stopOpacity={0.18 * g.steep} />
          <stop offset={1} stopColor="#000" stopOpacity={0.25 * g.steep} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#sw-${id})`}>
        <g transform={g.content}>
          <Page side={g.side} slots={face?.slots ?? []} frame={frame} id={`${id}${face?.id ?? ''}`} stub={face?.stub} />
        </g>
        <rect x={-330} y={-200} width={660} height={PH + 400} fill="url(#dk-spineU)" opacity={flat} />
        <path d={g.d} fill={`url(#swf-${id})`} />
        {inner && <path d={g.d} fill="#d9cfb8" opacity={0.5 * g.steep} />}
      </g>
      <path d={`M${g.ex} ${g.top} L${g.ex} ${g.bot}`} stroke="#bfb293" strokeWidth={2.2} opacity={edge} />
    </>
  );
};

/** the sheets of a riffle or a block, drawn so the ones nearest upright lie on top of their side */
const drawOrder = <T extends {th: number}>(list: T[]) => [
  ...list.filter((x) => Math.cos(x.th) >= 0).sort((a, b) => a.th - b.th),
  ...list.filter((x) => Math.cos(x.th) < 0).sort((a, b) => b.th - a.th),
];

const BLOCK_LAYERS = 9;

/**
 * A riffle or a bulk turn in progress. The first sheet to lift carries the page it lifts from; the
 * last to land carries the page it lands as; the sheets between are blank. Under them: on the side
 * they leave, the next blank sheet until the last has lifted, then the new spread's page; on the
 * side they land on, the old page until the first lands, then blank backs, then the new page.
 */
const SwingTurn: React.FC<{tr: Turn; p: number; frame: number; get: (s: number, side: Side) => Slot[]; stub: (s: number, side: Side) => boolean; total: number}> = ({tr, p, frame, get, stub, total}) => {
  const dep: Side = tr.dir > 0 ? 'right' : 'left';
  const arr: Side = tr.dir > 0 ? 'left' : 'right';
  const n = tr.kind === 'riffle' ? tr.sheets : 1;
  const us = tr.kind === 'riffle' ? riffleProgress(p, n) : [p];
  const lifted = us.filter((u) => u > 0).length;
  const landed = us.filter((u) => u >= 1).length;
  const depBase = lifted >= n ? get(tr.to, dep) : lifted === 0 ? get(tr.from, dep) : [];
  const arrBase = landed === 0 ? get(tr.from, arr) : landed >= n ? get(tr.to, arr) : [];
  const fromFace: Face = {slots: get(tr.from, dep), id: `f${tr.from}`, stub: stub(tr.from, dep)};
  const toFace: Face = {slots: get(tr.to, arr), id: `t${tr.to}`, stub: stub(tr.to, arr)};
  type Item = {th: number; id: string; right: Face; left: Face; inner?: boolean};
  const items: Item[] = [];
  us.forEach((u, i) => {
    if (u <= 0 || u >= 1) return;
    const e = swingEase(u);
    const th = (tr.dir > 0 ? e : 1 - e) * Math.PI;
    const departing = i === 0 ? fromFace : null;
    const arriving = i === n - 1 ? toFace : null;
    items.push({th, id: `s${i}`, right: dep === 'right' ? departing : arriving, left: dep === 'left' ? departing : arriving});
  });
  let sheets: React.ReactNode;
  if (tr.kind === 'bulk' && items.length) {
    // the block's sheets fan by a tiny angle beyond its top sheet, towards the flatter side, so its
    // thickness shows as a band of edges in the air and collapses to nothing lying on a stack; the
    // top sheet is drawn last, over its own block
    const top = items[0];
    const spread = (Math.abs(tr.toSheets - tr.fromSheets) / Math.max(1, total)) * 0.09 * Math.sin(top.th);
    const away = top.th < Math.PI / 2 ? -1 : 1;
    const inner: Item[] = [];
    for (let i = BLOCK_LAYERS - 1; i >= 1; i--) inner.push({th: top.th + (away * spread * i) / (BLOCK_LAYERS - 1), id: `b${i}`, right: null, left: null, inner: true});
    sheets = (
      <>
        {drawOrder(inner).map((x) => <SwingSheet key={x.id} {...x} frame={frame} />)}
        <SwingSheet key="top" {...top} frame={frame} />
      </>
    );
  } else {
    sheets = drawOrder(items).map((x) => <SwingSheet key={x.id} {...x} frame={frame} />);
  }
  return (
    <>
      <Page side={dep} slots={depBase} frame={frame} id={`d${tr.from}`} stub={lifted >= n ? stub(tr.to, dep) : lifted === 0 && stub(tr.from, dep)} />
      <Page side={arr} slots={arrBase} frame={frame} id={`a${tr.from}`} stub={landed >= n ? stub(tr.to, arr) : landed === 0 && stub(tr.from, arr)} />
      <SpineShade line={false} />
      {sheets}
    </>
  );
};

/* ---------------- tearing a page out ---------------- */

/** what was drawn on the torn sheet: since the page's previous tear (if any), before this one */
const tornSlots = (S: Schedule, tear: Tear) => {
  const prev = tearOf(S, tear.spread, tear.side, tear.start - 1);
  return (S.pages[tear.spread]?.[tear.side] ?? []).filter((x) => x.start < tear.start && (!prev || x.start >= prev.start));
};

/** Under the gutter shade: the facing page, the page revealed under the torn one, and the stub. */
const TearUnder: React.FC<{tear: Tear; frame: number; S: Schedule; get: (s: number, side: Side) => Slot[]; stub: (s: number, side: Side) => boolean}> = ({tear, frame, S, get, stub}) => {
  const other: Side = tear.side === 'left' ? 'right' : 'left';
  const {r, away} = tearState((frame - tear.start) / (tear.end - tear.start));
  return (
    <>
      <Page side={other} slots={get(tear.spread, other)} frame={frame} id={`tu${tear.spread}${other[0]}`} stub={stub(tear.spread, other)} />
      <Page side={tear.side} slots={get(tear.spread, tear.side)} frame={frame} id={`tr${tear.spread}${tear.side[0]}`} />
      {/* the stub reaches a little under the piece, so the page looks whole until it rips */}
      <Stub side={tear.side} id={`tearing${tear.start}`} under={6} frame={frame} slots={tornSlots(S, tear)} edge={away > 0 ? PH : r * PH} />
    </>
  );
};

/**
 * Over the gutter shade: the torn piece. While the rip runs down, the loose top swings about the
 * rip front and the still-attached part leans with the pull, strip by strip about its own point on
 * the tear line (so it stays attached), strongly just below the front, not at all at the bottom.
 * Then the free page slides off the book. One shadow throughout: the piece's own outline, cut a
 * blur's width below the front (never at it), growing softer, darker and further as it lifts.
 */
const TearPiece: React.FC<{tear: Tear; frame: number; S: Schedule}> = ({tear, frame, S}) => {
  const sx = tear.side === 'left' ? -1 : 1;
  const {r, away, swing, k} = tearState((frame - tear.start) / (tear.end - tear.start));
  const slots = tornSlots(S, tear);
  const py = r * PH;
  const px = sx * tearX(py);
  const outline = piecePath(sx);
  const id = `tp${tear.start}`;
  const body = (key: string) => (
    <>
      <clipPath id={`${id}-pc-${key}`}><path d={outline} /></clipPath>
      <g clipPath={`url(#${id}-pc-${key})`}>
        <Page side={tear.side} slots={slots} frame={frame} id={`${id}${key}`} />
        <rect x={-330} y={0} width={660} height={PH} fill="url(#dk-spineU)" opacity={1 - k} />
      </g>
      <TornEdge sx={sx} dx={1.5} yMax={away > 0 ? PH : py} />
    </>
  );
  const shadow = (tf: string, strength: number) => (
    <path d={outline} fill="#1a1008" opacity={(0.25 + 0.15 * k) * strength} filter={`url(#${id}-blur)`}
      transform={`${tf} translate(${(sx * (4 + 26 * k)).toFixed(3)} ${(6 + 34 * k).toFixed(3)})`} />
  );
  let parts: React.ReactNode;
  if (away <= 0) {
    const rot = `rotate(${(sx * swing).toFixed(4)} ${px.toFixed(2)} ${py.toFixed(2)})`;
    const strips: React.ReactNode[] = [];
    if (py < PH) {
      const N = 48;
      const h = PH / N;
      // bottom strips first: each strip above leans a little more and lies over the one below
      for (let i = N - 1; i >= 0; i--) {
        const y0 = i * h;
        const y1 = y0 + h;
        if (y1 <= py) continue;
        const ya = Math.max(y0, py);
        const yc = (ya + y1) / 2;
        strips.push(
          <g key={i} transform={`rotate(${(sx * lean(yc, py, swing)).toFixed(4)} ${(sx * tearX(yc)).toFixed(2)} ${yc.toFixed(2)})`}>
            <clipPath id={`${id}-rg-s${i}`}><rect x={-PW - 10} y={ya} width={2 * PW + 20} height={y1 - ya + 1.2} /></clipPath>
            <g clipPath={`url(#${id}-rg-s${i})`}>{body(`b${i}`)}</g>
          </g>,
        );
      }
    }
    parts = (
      <>
        {r > 0 && (
          <g transform={rot}>
            <clipPath id={`${id}-rg-sh`}><rect x={-PW - 200} y={-200} width={2 * PW + 400} height={py + 400} /></clipPath>
            <g clipPath={`url(#${id}-rg-sh)`}>{shadow('', r)}</g>
          </g>
        )}
        {strips}
        {r > 0 && (
          <g transform={rot}>
            <clipPath id={`${id}-rg-up`}><rect x={-PW - 60} y={-200} width={2 * PW + 120} height={py + 200} /></clipPath>
            <g clipPath={`url(#${id}-rg-up)`}>{body('up')}</g>
          </g>
        )}
      </>
    );
  } else {
    const tf = awayTransform(sx, swing, away);
    parts = (
      <>
        {shadow(tf, 1)}
        <g transform={tf}>{body('away')}</g>
      </>
    );
  }
  return (
    <>
      <defs>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={4 + 18 * k} /></filter>
      </defs>
      {parts}
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

/** sheets in the whole book: the film's own count, or a little more than the story ever turns */
const bookSheets = (film: BookFilm) => film.sheets ?? film.S.maxSheets + Math.max(4, Math.round(film.S.maxSheets * 0.25));

export const Book: React.FC<{film: BookFilm; outroText?: {title: string; sub?: string}; layout?: BookLayout}> = ({film, outroText, layout = 'wide'}) => {
  const {width: screenW, height: screenH} = useVideoConfig();
  const frame = useCurrentFrame();
  const {S} = film;
  const f = Math.min(frame, S.end);
  const st = stateAt(S, f);
  // a page shows only what was drawn since it was last torn out; a stub lies on it afterwards
  const get = (spread: number, side: Side) => {
    const t = tearOf(S, spread, side, f);
    const sl = S.pages[spread]?.[side] ?? [];
    return t ? sl.filter((x) => x.start >= t.start) : sl;
  };
  const stub = (spread: number, side: Side) => {
    const t = tearOf(S, spread, side, f);
    return !!t && f >= t.end;
  };
  const tr = st.turn;
  const peel = tr && tr.kind === 'peel' ? tr : null;
  const geo = peel ? turnGeometry(turnEase(st.p), peel.dir, PW, PH) : null;
  // turn shading fades in as the sheet lifts and out as it lands, and the spine shadow on top of
  // the book fades the opposite way, so nothing pops on the first or last frame of a turn
  const k = peel && geo ? Math.min(1, 3 * Math.sin(Math.PI * Math.min(1, Math.max(0, st.p)))) : 0;

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

  // the page stacks: sheets on the left and right, moving across gradually during any turn
  const total = bookSheets(film);
  const left = sheetsAt(S, f);
  const tl = stackT(left, total);
  const tR = stackT(total - left, total);

  // what lies where
  const a = st.spread;
  const tearing = tr ? null : S.tears.find((t) => t.spread === a && f >= t.start && f < t.end) ?? null;
  let base: React.ReactNode;
  if (tearing) {
    base = <TearUnder tear={tearing} frame={f} S={S} get={get} stub={stub} />;
  } else if (tr && !peel) {
    base = <SwingTurn tr={tr} p={st.p} frame={f} get={get} stub={stub} total={total} />;
  } else if (!peel || !geo) {
    base = (
      <>
        <Page side="left" slots={get(a, 'left')} frame={f} id={`s${a}l`} pencil stub={stub(a, 'left')} />
        <Page side="right" slots={get(a, 'right')} frame={f} id={`s${a}r`} pencil stub={stub(a, 'right')} />
      </>
    );
  } else {
    const fwd = peel.dir === 1;
    const still: Side = fwd ? 'left' : 'right'; // the page that does not move
    const moving: Side = fwd ? 'right' : 'left';
    const backSide: Side = fwd ? 'left' : 'right'; // where the sheet's back ends up
    base = (
      <>
        <Page side={still} slots={get(peel.from, still)} frame={f} id={`s${peel.from}${still[0]}`} stub={stub(peel.from, still)} />
        {/* revealed underneath: the next spread's page on the moving side */}
        <Page side={moving} slots={get(peel.to, moving)} frame={f} id={`s${peel.to}${moving[0]}u`} stub={stub(peel.to, moving)} />
        {/* shadow of the lifted sheet on the revealed page */}
        <path d={polyD(geo.flat.length ? sheetRect(moving) : [])} fill="url(#under-shadow)" clipPath="url(#reveal-clip)" opacity={k} />
        <clipPath id="reveal-clip"><path d={polyD(sheetRect(moving))} /></clipPath>
        {/* the part of the sheet still flat */}
        <clipPath id="flat-clip"><path d={polyD(geo.flat)} /></clipPath>
        <g clipPath="url(#flat-clip)">
          <Page side={moving} slots={get(peel.from, moving)} frame={f} id={`s${peel.from}${moving[0]}`} stub={stub(peel.from, moving)} />
        </g>
        {/* under the flap; together with the fading one on top it adds up to the usual shadow */}
        <SpineShade opacity={k} />
        {/* the folded flap: its back is the next spread's page on the other side */}
        <path d={polyD(geo.flap)} fill="#000" opacity={(peel.pages > 1 ? 0.34 : 0.22) * k} filter="url(#flap-shadow)" />
        {/* a block of pages turned together: its thickness shows as stacked sheet edges under the flap */}
        {peel.pages > 1 && Array.from({length: Math.min(8, peel.pages + 2)}, (_, i) => {
          const o = (Math.min(8, peel.pages + 2) - i) * 3.2;
          return <path key={i} d={polyD(geo.flap)} transform={`translate(${-geo.n.x * o} ${-geo.n.y * o + o * 0.35})`}
            fill={i % 2 ? '#efeadd' : '#e4ddcc'} stroke="#cbbfa4" strokeWidth={1.4} opacity={k} />;
        })}
        <clipPath id="flap-clip"><path d={polyD(geo.flap)} /></clipPath>
        <g clipPath="url(#flap-clip)">
          <g transform={geo.backMatrix}>
            <Page side={backSide} slots={get(peel.to, backSide)} frame={f} id={`s${peel.to}${backSide[0]}b`} stub={stub(peel.to, backSide)} />
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

  const outroIn = interpolate(frame, [S.end, S.end + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const subIn = interpolate(frame, [S.end + 45, S.end + 75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <PaperCtx.Provider value={film.paper ?? 'ruled'}>
    <AbsoluteFill style={{background: '#3d2b20'}}>
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
          <linearGradient id="spine" x1="0" x2="1">
            {SPINE_SHADOW.map(([o, a], i) => <stop key={i} offset={o} stopColor={SPINE_TONE} stopOpacity={a} />)}
          </linearGradient>
        </defs>
        <defs dangerouslySetInnerHTML={{__html: DESK_DEFS}} />
        {/* the desk, the book's shadow on it, the two leather boards, the band's ends */}
        <Raw svg={DESK + bookShadowSVG(-BW, 2 * BW) + BOARDS + BAND_SVG} />
        {/* the pages stand above the boards; the ribbon comes out from between them */}
        <StackShadow tl={tl} tr={tR} />
        <Raw svg={RIBBON_SVG} />
        <Block side="left" t={tl} />
        <Block side="right" t={tR} />
        {base}
        {!tr && <SpineShade />}
        {tearing && <TearPiece tear={tearing} frame={f} S={S} />}
        {peel && k < 1 && <SpineShade opacity={1 - k} />}
        {/* the binding line stays on top of riffling sheets: they are bound there */}
        {tr && !peel && <rect x={-1} y={0} width={2} height={PH} fill={SPINE_TONE} opacity={0.45} />}
        <Raw svg={VIGNETTE} />
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
const SpineShade: React.FC<{opacity?: number; line?: boolean}> = ({opacity = 1, line = true}) => (
  <g opacity={opacity}>
    <rect x={-SPINE_W} y={0} width={2 * SPINE_W} height={PH} fill="url(#spine)" />
    {line && <rect x={-1} y={0} width={2} height={PH} fill={SPINE_TONE} opacity={0.45} />}
  </g>
);

export {INK};
