// Page-turn geometry for an open book (pure, no React).
//
// Book coordinates: the spine is the line x = 0, pages run from y = 0 (top) to y = PH (bottom);
// the right page covers x in [0, PW], the left page x in [-PW, 0].
//
// A turning sheet is folded along a straight line (the classic 2D "page peel"): the sheet's free
// bottom corner P0 is lifted to C; the fold is the perpendicular bisector of P0-C. The part of the
// sheet on P0's side of the fold is mirrored across it and shows the sheet's back; the rest stays
// flat. Keeping C within one page width of the spine's bottom end means the fold never crosses
// the spine, so the sheet never tears off the binding. At the end of the turn the fold IS the spine
// and the back lies exactly on the other page.

export type Pt = {x: number; y: number};

export type TurnGeo = {
  /** the part of the sheet still lying flat (front side visible) */
  flat: Pt[];
  /** the folded-over part, in book coordinates (back side visible) */
  flap: Pt[];
  /** SVG matrix that draws content laid out at its FINAL page position onto the flap */
  backMatrix: string;
  /** a point on the fold and the unit normal pointing to the uncovered (revealed) side */
  fold: Pt;
  n: Pt;
  /** fold line end points clipped to the sheet (for shading strokes) */
  foldA: Pt | null;
  foldB: Pt | null;
};

const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;

/** Clip a convex polygon to the half-plane h(p) <= 0 (Sutherland-Hodgman, one edge). */
const clipHalf = (poly: Pt[], h: (p: Pt) => number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ha = h(a);
    const hb = h(b);
    if (ha <= 0) out.push(a);
    if ((ha <= 0) !== (hb <= 0)) {
      const t = ha / (ha - hb);
      out.push({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
    }
  }
  return out;
};

/** Slow lift, quick middle, soft landing: how a hand turns a page. */
export const turnEase = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
};

/**
 * Geometry of a sheet turning at progress p (0..1).
 * dir = 1: the right-hand sheet turns over to the left (reading forward);
 * dir = -1: the left-hand sheet turns back to the right.
 */
export const turnGeometry = (p: number, dir: 1 | -1, PW: number, PH: number): TurnGeo | null => {
  if (p <= 0.002) return null;
  const phi = Math.PI * Math.min(1, p);
  // the corner swings round the spine's bottom end: a little inside the page width in the middle of
  // the turn (the paper bends) and lifted less than a full circle (it stays low, like a real page)
  const rho = 1 - 0.18 * Math.sin(phi);
  const lift = 0.62;
  const cx = PW * rho * Math.cos(phi);
  const cy = PH - PW * rho * Math.sin(phi) * lift;
  // canonical (forward) geometry, mirrored for a backward turn
  const m = (q: Pt): Pt => ({x: q.x * dir, y: q.y});
  const P0 = m({x: PW, y: PH});
  const C = m({x: cx, y: cy});
  const len = Math.hypot(P0.x - C.x, P0.y - C.y);
  if (len < 1e-3) return null;
  const n = {x: (P0.x - C.x) / len, y: (P0.y - C.y) / len};
  const F = {x: (P0.x + C.x) / 2, y: (P0.y + C.y) / 2};
  const h = (q: Pt) => dot({x: q.x - F.x, y: q.y - F.y}, n);
  const x0 = dir === 1 ? 0 : -PW;
  const sheet: Pt[] = [{x: x0, y: 0}, {x: x0 + PW, y: 0}, {x: x0 + PW, y: PH}, {x: x0, y: PH}];
  const flat = clipHalf(sheet, h);
  const lifted = clipHalf(sheet, (q) => -h(q));
  const refl = (q: Pt): Pt => {
    const k = 2 * h(q);
    return {x: q.x - k * n.x, y: q.y - k * n.y};
  };
  const flap = lifted.map(refl);
  // content at its final position: un-mirror about the spine, then reflect across the fold
  const fn = 2 * dot(F, n);
  const a = -(1 - 2 * n.x * n.x);
  const b = 2 * n.x * n.y;
  const c = -2 * n.x * n.y;
  const d = 1 - 2 * n.y * n.y;
  const backMatrix = `matrix(${a} ${b} ${c} ${d} ${fn * n.x} ${fn * n.y})`;
  // the fold segment: the points of `flat` that lie on the fold line
  const onFold = flat.filter((q) => Math.abs(h(q)) < 1e-3);
  return {flat, flap, backMatrix, fold: F, n, foldA: onFold[0] ?? null, foldB: onFold[1] ?? null};
};

export const polyD = (pts: Pt[]) => (pts.length ? `M${pts.map((q) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(' L')} Z` : '');
