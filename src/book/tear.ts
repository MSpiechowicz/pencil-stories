// The geometry of tearing a page out (pure, no React). Worked out for the RIGHT page, in book
// coordinates (the spine is x = 0, the page runs x 0..PW, y 0..PH); the left page is the same
// mirrored about the spine (sx = -1). Only the tear's shapes and motion are mirrored, never the
// drawings on the page.

const PW = 1000;
const PH = 1300;

/** the tear line by the spine: a slow wobble plus fine jagged fibres (fixed, seeded) */
export const TEAR_PTS: [number, number][] = (() => {
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts: [number, number][] = [];
  for (let y = 0; y <= PH; y += 9) pts.push([30 + 7 * Math.sin(y / 110) + 3 * Math.sin(y / 23) + (rnd() * 8 - 4), y]);
  pts[pts.length - 1][1] = PH;
  return pts;
})();

export const tearX = (y: number) => TEAR_PTS[Math.min(TEAR_PTS.length - 1, Math.max(0, Math.round(y / 9)))][0];

const f = (v: number) => v.toFixed(2);
/** the tear line as a path, mirrored by sx, shifted by dx away from the spine, down to yMax */
export const tearLine = (sx: number, dx = 0, yMax = PH, jitter = false) => {
  const pts = TEAR_PTS.filter(([, y]) => y <= yMax);
  if (pts.length < 2) return '';
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(sx * (x + dx + (jitter ? (i % 3 === 0 ? 1.6 : -0.6) : 0)))} ${f(y)}`).join(' ');
};
/** the stub left in the gutter; `under` reaches that far beneath the torn piece so no seam shows */
export const stubPath = (sx: number, under = 0) => `M0 0 ${tearLine(sx, under).replace(/^M/, 'L')} L0 ${PH}Z`;
/** the torn piece: everything beyond the tear line */
export const piecePath = (sx: number) => `${tearLine(sx)} L${sx * (PW + 6)} ${PH} L${sx * (PW + 6)} 0Z`;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (u: number) => { const c = clamp(u); return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2; };

/**
 * The tear at progress p (0..1): `r` how far down the rip has run, `away` how far the free page has
 * gone, `swing` the angle (degrees) the loose part has turned, `k` 0..1 how far it has lifted
 * (its shadow grows softer, darker and further with it).
 */
export const tearState = (p: number) => {
  const r = ease(p / 0.36);
  const away = ease((p - 0.38) / 0.62);
  return {r, away, swing: 5 * r, k: ease(away * 3)};
};

/** how much an attached strip at height y leans while the rip front is at yR: as much as the
 *  loose part just below the front, nothing at the bottom of the page */
export const lean = (y: number, yR: number, swing: number) => (yR >= PH ? swing : swing * Math.pow(clamp(1 - (y - yR) / (PH - yR)), 1.6));

/** the free page's motion, mirrored by sx: it swings on round the bottom of the tear, lifts a
 *  little towards the camera and slides off the book and out of the frame */
export const awayTransform = (sx: number, swing: number, away: number) => {
  const bx = sx * tearX(PH);
  const rot = sx * (swing + 22 * away);
  const lift = Math.sin(Math.PI * ease(away * 1.4)) * 0.06;
  return `translate(${(sx * 2600 * away * away).toFixed(4)} ${(380 * away).toFixed(4)}) rotate(${rot.toFixed(4)} ${bx.toFixed(2)} ${PH}) ` +
    `translate(${sx * PW / 2} ${PH / 2}) scale(${(1 + lift).toFixed(5)}) translate(${-sx * PW / 2} ${-PH / 2})`;
};
