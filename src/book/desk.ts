// The desk the book lies on, and the book's leather boards (pure, no React): walnut planks, loose
// used notes with coffee rings and grime, a mug, a pencil with its shavings, an eraser, a paper
// ball, a paperclip; the two leather boards with stitching and brass corners, the elastic band and
// the ribbon marker. Everything is fixed SVG text, built once from seeded random numbers, so every
// frame of a film is identical.
//
// Light comes from the top left: every object casts its shadow down and to the right.
// Book coordinates as in Book.tsx: the spine is x = 0, the pages run y = 0..PH, x = -PW..PW.

export const PW = 1000;
export const PH = 1300;

/** one leather board: width (spine to outer edge), top and height */
export const BW = PW + 56;
export const BY = -34;
export const BH = PH + 90;
/** the elastic band is fixed to the back board this far in from its outer edge */
export const BAND_X = BW - 190;

const COVER = '#6b432b';
const COVER_DARK = '#4b2d1c';
const RIBBON = '#b23a32';
const PAPER = '#fbfaf6';

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = (a: number, b: number) => a + (b - a) * rnd();
const f1 = (v: number) => v.toFixed(1);

/* ---------------- shared definitions ---------------- */

const spineStops = Array.from({length: 31}, (_, i) => {
  const t = i / 30;
  const d = Math.abs(t - 0.5) * 2;
  return `<stop offset="${t}" stop-color="#5b5046" stop-opacity="${(0.1 * (1 - d) ** 2 + 0.16 * Math.exp(-d / 0.045)).toFixed(3)}"/>`;
}).join('');

/** filters and gradients used by the desk, the boards and the turning sheets */
export const DESK_DEFS = `
  <filter id="dk-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="dk-leather" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="9" result="n"/>
    <feColorMatrix in="n" values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0.55 -0.05"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="dk-pores" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="5"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 -0.08"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="dk-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.45"/>
  </filter>
  <filter id="dk-soft" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.35"/>
  </filter>
  <filter id="dk-cast" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="dk-castWide" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="dk-paperShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="dk-smudge" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  <radialGradient id="dk-vignette" cx="50%" cy="48%" r="70%">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
  </radialGradient>
  <radialGradient id="dk-age" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#c9a86a" stop-opacity="0"/><stop offset="1" stop-color="#a8823f" stop-opacity=".45"/></radialGradient>
  <radialGradient id="dk-coffeeWash"><stop offset=".6" stop-color="#8a5a30" stop-opacity=".03"/><stop offset="1" stop-color="#8a5a30" stop-opacity=".1"/></radialGradient>
  <linearGradient id="dk-coffee" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2416"/><stop offset="1" stop-color="#1c110a"/></linearGradient>
  <radialGradient id="dk-ballShade" cx="35%" cy="30%" r="80%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a2016" stop-opacity=".35"/></radialGradient>
  <linearGradient id="dk-brass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e9cf86"/><stop offset=".45" stop-color="#b48a3e"/><stop offset="1" stop-color="#7a5a24"/>
  </linearGradient>
  <linearGradient id="dk-band" x1="0" x2="1"><stop offset="0" stop-color="#0f0d0c"/><stop offset=".4" stop-color="#2a2522"/><stop offset=".6" stop-color="#2a2522"/><stop offset="1" stop-color="#0f0d0c"/></linearGradient>
  <linearGradient id="dk-satin" gradientUnits="userSpaceOnUse" x1="-16" y1="0" x2="40" y2="0">
    <stop offset="0" stop-color="#8a2620"/><stop offset=".35" stop-color="${RIBBON}"/><stop offset=".55" stop-color="#e06a5f"/>
    <stop offset=".75" stop-color="${RIBBON}"/><stop offset="1" stop-color="#7d211c"/>
  </linearGradient>
  <linearGradient id="dk-ribbonIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="dk-spineU" gradientUnits="userSpaceOnUse" x1="-330" x2="330" y1="0" y2="0">${spineStops}</linearGradient>
  <linearGradient id="dk-curlL" x1="0" x2="1"><stop offset="0" stop-color="#3a2a1a" stop-opacity=".14"/><stop offset=".12" stop-color="#3a2a1a" stop-opacity=".04"/><stop offset=".45" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="dk-curlR" x1="1" x2="0"><stop offset="0" stop-color="#3a2a1a" stop-opacity=".14"/><stop offset=".12" stop-color="#3a2a1a" stop-opacity=".04"/><stop offset=".45" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
`;

/* ---------------- the desk and what lies on it ---------------- */

function planks(): string {
  seed = 11;
  const tones = ['#4a3426', '#3d2b20', '#563c2b'];
  const grain = '#2a1d15';
  let s = `<rect x="-2400" y="-1000" width="4800" height="3400" fill="${tones[0]}"/>`;
  for (let i = 0; i < 10; i++) {
    const y = -1000 + i * 360;
    s += `<rect x="-2400" y="${y}" width="4800" height="360" fill="${tones[i % 3]}"/>`;
    for (let g = 0; g < 14; g++) {
      const gy = y + R(15, 345);
      const a = R(-14, 14);
      s += `<path d="M-2400 ${f1(gy)} C-1200 ${f1(gy + a)} -400 ${f1(gy - a)} 600 ${f1(gy + a * 0.6)} S1800 ${f1(gy - a)} 2400 ${f1(gy)}" stroke="${grain}" stroke-opacity="${R(0.15, 0.4).toFixed(2)}" stroke-width="${R(1, 4).toFixed(1)}" fill="none"/>`;
    }
    if (i % 3 === 1) {
      const kx = R(-1800, 1800);
      const ky = y + R(80, 280);
      s += `<ellipse cx="${f1(kx)}" cy="${f1(ky)}" rx="60" ry="22" fill="none" stroke="${grain}" stroke-opacity=".4" stroke-width="3"/><ellipse cx="${f1(kx)}" cy="${f1(ky)}" rx="26" ry="9" fill="${grain}" opacity=".45"/>`;
    }
    s += `<rect x="-2400" y="${y}" width="4800" height="4" fill="#000" opacity=".35"/>`;
  }
  return s + `<rect x="-2400" y="-1000" width="4800" height="3400" filter="url(#dk-grain)" fill="#fff"/>`;
}

function coffeeRing(cx: number, cy: number, r: number): string {
  // a dried coffee ring: darker uneven rim, a gap where the cup lifted, a faint wash, two drips
  let d = '';
  for (let k = 0; k < 3; k++) {
    const a0 = R(0, 6.28);
    const len = R(4.6, 6.0);
    let p = '';
    for (let i = 0; i <= 40; i++) {
      const a = a0 + (len * i) / 40;
      const rr = r + Math.sin(a * 5 + k) * 1.8 + R(-1, 1);
      p += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr + k * 3)} ${f1(cy + Math.sin(a) * rr + k * 2)} `;
    }
    d += `<path d="${p}" fill="none" stroke="#6b3f1c" stroke-opacity="${(0.22 - k * 0.05).toFixed(2)}" stroke-width="${(3.5 - k).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="url(#dk-coffeeWash)"/>${d}` +
    `<circle cx="${cx + r * 1.2}" cy="${cy - r * 0.5}" r="5" fill="#6b3f1c" opacity=".18"/><circle cx="${cx + r * 1.35}" cy="${cy - r * 0.35}" r="2.5" fill="#6b3f1c" opacity=".2"/>`;
}

function blob(cx: number, cy: number, r: number, n = 9): string {
  // an irregular rounded shape, for splashes and water marks
  const pts = Array.from({length: n}, (_, i) => {
    const a = (i / n) * 6.283;
    const rr = r * R(0.6, 1.15);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * R(0.7, 1)];
  });
  let d = `M${f1((pts[0][0] + pts[n - 1][0]) / 2)} ${f1((pts[0][1] + pts[n - 1][1]) / 2)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    d += ` Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)}`;
  }
  return d + 'Z';
}

function grime(h: number, dense: number, x1: number): string {
  // small marks of use: coffee splashes with darker dried edges, a partial ring, a graphite
  // fingerprint, a pencil smudge and pale water marks, on the part of the sheet that shows
  let s = '';
  const spot = () => [R(50, x1 - 40), R(60, h - 60)];
  for (let i = 0; i < 3 * dense; i++) {
    const [x, y] = spot();
    const r = R(8, 22);
    const d = blob(x, y, r, 7 + Math.floor(R(0, 4)));
    s += `<path d="${d}" fill="#8a5a30" opacity="${R(0.07, 0.13).toFixed(2)}"/><path d="${d}" fill="none" stroke="#6b3f1c" stroke-opacity="${R(0.18, 0.3).toFixed(2)}" stroke-width="${R(1.2, 2.2).toFixed(1)}"/>`;
    for (let k = 0; k < 3; k++) s += `<circle cx="${f1(x + R(-2.4, 2.4) * r)}" cy="${f1(y + R(-2.4, 2.4) * r)}" r="${R(1.5, 4).toFixed(1)}" fill="#6b3f1c" opacity="${R(0.12, 0.25).toFixed(2)}"/>`;
  }
  {
    const [x, y] = spot();
    const r = R(26, 34);
    const a0 = R(0, 6.28);
    const a1 = a0 + R(2, 3.4);
    s += `<path d="M${f1(x + Math.cos(a0) * r)} ${f1(y + Math.sin(a0) * r)} A${f1(r)} ${f1(r)} 0 ${a1 - a0 > 3.14 ? 1 : 0} 1 ${f1(x + Math.cos(a1) * r)} ${f1(y + Math.sin(a1) * r)}" fill="none" stroke="#6b3f1c" stroke-opacity=".2" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  {
    const [x, y] = spot();
    const rot = R(-40, 40);
    let f = '';
    for (let k = 1; k <= 7; k++) f += `<ellipse cx="0" cy="0" rx="${f1(k * 3.2)}" ry="${f1(k * 4.4)}" fill="none" stroke="#3a3d42" stroke-width="1.4" stroke-dasharray="${R(4, 9).toFixed(1)} ${R(2, 4).toFixed(1)}"/>`;
    s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity=".16">${f}</g>`;
  }
  {
    const [x, y] = spot();
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${R(40, 70).toFixed(1)}" ry="${R(6, 12).toFixed(1)}" transform="rotate(${R(-20, 20).toFixed(1)} ${f1(x)} ${f1(y)})" fill="#3a3d42" opacity=".12" filter="url(#dk-smudge)"/>`;
  }
  for (let i = 0; i < 2 * dense; i++) {
    const [x, y] = spot();
    const d = blob(x, y, R(18, 34), 10);
    s += `<path d="${d}" fill="#c9b48a" opacity=".12"/><path d="${d}" fill="none" stroke="#a88c5c" stroke-opacity=".22" stroke-width="1.4"/>`;
  }
  return s;
}

type SheetOpts = {ruled?: boolean; margin?: boolean; writing?: boolean; fold?: boolean; tint?: string;
  stain?: [number, number]; grime?: number; grimeX?: number};

function looseSheet(x: number, y: number, w: number, h: number, rot: number, o: SheetOpts = {}): string {
  seed = (Math.abs(Math.round(x * 13 + y * 7 + 991)) % 2147483646) + 1;
  const tint = o.tint ?? '#efe6d2';
  const F = 70; // size of a folded corner
  // the sheet's own outline: a dog-ear cuts the corner away so the desk shows through
  const outline = o.fold ? `M0 0 L${w} 0 L${w} ${h - F} L${w - F} ${h} L0 ${h}Z` : `M0 0 L${w} 0 L${w} ${h} L0 ${h}Z`;
  const cid = `dk-cl${Math.round(Math.abs(x))}${Math.round(Math.abs(y))}`;
  let lines = '';
  if (o.ruled) for (let ly = 60; ly < h - 20; ly += 34) lines += `<rect x="0" y="${ly}" width="${w}" height="1.5" fill="#9fb3cc" opacity=".55"/>`;
  if (o.margin) lines += `<rect x="54" y="0" width="2" height="${h}" fill="#d98c8c" opacity=".7"/>`;
  let scrib = '';
  if (o.writing) {
    for (let ly = 52; ly < h - 40; ly += 34) {
      if (rnd() < 0.15) continue;
      let d = `M${f1(70 + R(0, 20))} ${ly}`;
      let xx = 80;
      const end = R(w * 0.45, w - 40);
      while (xx < end) {
        xx += R(8, 16);
        d += ` Q${f1(xx - 4)} ${f1(ly - R(6, 14))} ${f1(xx)} ${f1(ly + R(-2, 2))}`;
      }
      scrib += `<path d="${d}" stroke="#4a4f57" stroke-opacity=".5" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    }
  }
  // the folded flap lies on the sheet: paper back side, a soft shadow along the crease
  const flap = o.fold
    ? `<path d="M${w} ${h - F} L${w - F} ${h} L${w - F * 0.92} ${h - F * 0.92}Z" fill="#000" opacity=".12" transform="translate(-3 -3)"/>
      <path d="M${w} ${h - F} L${w - F} ${h} L${w - F * 0.95} ${h - F * 0.95}Z" fill="#e4d9c2"/>
      <path d="M${w} ${h - F} L${w - F} ${h}" stroke="#b9ab8e" stroke-width="1.5"/>`
    : '';
  const stain = (o.stain ? coffeeRing(o.stain[0], o.stain[1], 60) : '') + (o.grime ? grime(h, o.grime, o.grimeX ?? w) : '');
  // the shadow is offset in desk space (down-right), not in the sheet's rotated space
  return `<g transform="translate(${x + 12} ${y + 20}) rotate(${rot})"><path d="${outline}" fill="#0a0603" opacity=".75" filter="url(#dk-paperShadow)"/></g>
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <clipPath id="${cid}"><path d="${outline}"/></clipPath>
    <g clip-path="url(#${cid})"><rect width="${w}" height="${h}" fill="${tint}"/><rect width="${w}" height="${h}" fill="url(#dk-age)" opacity=".7"/>${lines}${scrib}${stain}</g>${flap}
  </g>`;
}

function crumpled(x: number, y: number, r: number): string {
  // a faceted paper ball: irregular outline, two rings of creases, each facet lit from the top left
  seed = 77;
  const N = 18;
  const out: number[][] = [];
  const ring: number[][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 6.283 + R(-0.12, 0.12);
    out.push([Math.cos(a) * r * R(0.82, 1.04), Math.sin(a) * r * R(0.82, 1.04)]);
  }
  for (let j = 0; j < N / 2; j++) {
    const a = ((j + 0.5) / (N / 2)) * 6.283 + R(-0.2, 0.2);
    ring.push([Math.cos(a) * r * R(0.4, 0.6), Math.sin(a) * r * R(0.4, 0.6)]);
  }
  const c = [R(-0.1, 0.1) * r, R(-0.1, 0.1) * r];
  const tris: number[][][] = [];
  for (let i = 0; i < N; i++) tris.push([out[i], out[(i + 1) % N], ring[Math.floor(i / 2) % (N / 2)]]);
  for (let j = 0; j < N / 2; j++) {
    tris.push([ring[j], ring[(j + 1) % (N / 2)], out[(2 * j + 2) % N]]);
    tris.push([ring[j], ring[(j + 1) % (N / 2)], c]);
  }
  const P = (p: number[]) => `${f1(p[0])} ${f1(p[1])}`;
  let facets = '';
  for (const t of tris) {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const d = Math.hypot(cx, cy) / r;
    const b = Math.max(0, Math.min(1, 0.62 + 0.38 * Math.cos(Math.atan2(cy, cx) + 2.3) * d + R(-0.18, 0.18)));
    const col = `rgb(${Math.round(176 + 70 * b)},${Math.round(166 + 72 * b)},${Math.round(146 + 74 * b)})`;
    facets += `<path d="M${P(t[0])} L${P(t[1])} L${P(t[2])}Z" fill="${col}" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }
  let creases = '';
  for (const t of tris) if (rnd() < 0.45) creases += `<path d="M${P(t[0])} L${P(t[2])}" stroke="#fffdf6" stroke-opacity=".55" stroke-width="2"/>`;
  const outline = 'M' + out.map(P).join(' L') + 'Z';
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="${r * 0.3}" cy="${r * 0.55}" rx="${r * 0.95}" ry="${r * 0.55}" fill="#000" opacity=".4" filter="url(#dk-shadow)"/>
    <clipPath id="dk-ball"><path d="${outline}"/></clipPath>
    <g clip-path="url(#dk-ball)">${facets}${creases}
      <path d="M${-r} ${-r * 0.2} Q0 ${-r * 0.45} ${r} ${-r * 0.05} M${-r} ${r * 0.25} Q0 ${r * 0.05} ${r} ${r * 0.4}" stroke="#9fb3cc" stroke-width="3" fill="none" opacity=".55"/>
      <path d="M${-r * 0.5} ${-r} Q${-r * 0.3} 0 ${-r * 0.55} ${r}" stroke="#e3989b" stroke-width="3" fill="none" opacity=".5"/>
      <circle r="${r}" fill="url(#dk-ballShade)"/></g>
    <path d="${outline}" fill="none" stroke="#8d8370" stroke-width="2" stroke-linejoin="round" opacity=".6"/>
  </g>`;
}

const pencil = (x: number, y: number, rot: number, len: number) => `<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#dk-soft)">
    <rect x="0" y="-14" width="${len}" height="28" fill="#e2a22c"/>
    <rect x="0" y="-14" width="${len}" height="9" fill="#fff" opacity=".22"/>
    <rect x="0" y="5" width="${len}" height="9" fill="#000" opacity=".12"/>
    <path d="M${len} -14 L${len + 80} 0 L${len} 14Z" fill="#e7c9a0"/>
    <path d="M${len + 52} -5 L${len + 80} 0 L${len + 52} 5Z" fill="#333"/>
    <rect x="-46" y="-14" width="46" height="28" fill="#b9bcc0"/><rect x="-40" y="-14" width="4" height="28" fill="#8f9398"/><rect x="-12" y="-14" width="4" height="28" fill="#8f9398"/>
    <rect x="-96" y="-14" width="52" height="28" rx="8" fill="#e58a8a"/>
  </g>`;

function shaving(cx: number, cy: number, r: number, rot: number, span = 250): string {
  // one ruffled curl: a fan of bare wood with a scalloped, painted rim, ridges between the ruffles
  const a0 = ((-span / 2) * Math.PI) / 180;
  const a1 = ((span / 2) * Math.PI) / 180;
  const n = 44;
  const ruff = 9;
  const rim = (a: number) => r * (1 + 0.07 * Math.sin(((a - a0) / (a1 - a0)) * Math.PI * 2 * ruff));
  const pts = Array.from({length: n + 1}, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a) * rim(a), Math.sin(a) * rim(a)]; });
  const inner = Array.from({length: n + 1}, (_, i) => { const a = a1 - ((a1 - a0) * i) / n; return [Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3]; });
  const P = (p: number[]) => `${f1(p[0])} ${f1(p[1])}`;
  const body = 'M' + pts.map(P).join(' L') + ' L' + inner.map(P).join(' L') + 'Z';
  const edge = 'M' + pts.map(P).join(' L');
  let ridges = '';
  for (let k = 0; k <= ruff; k++) {
    const a = a0 + ((a1 - a0) * (k + 0.75)) / ruff;
    if (a > a1) break;
    ridges += `<path d="M${f1(Math.cos(a) * r * 0.32)} ${f1(Math.sin(a) * r * 0.32)} L${f1(Math.cos(a) * r * 0.97)} ${f1(Math.sin(a) * r * 0.97)}" stroke="#a07a4a" stroke-width="2" opacity=".45"/>`;
  }
  const id = `dk-sh${Math.round(cx)}${Math.round(cy)}`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${r}">
      <stop offset=".25" stop-color="#c79a63"/><stop offset=".55" stop-color="#ecd2a8"/><stop offset=".9" stop-color="#f6e3c2"/><stop offset="1" stop-color="#d9b483"/></radialGradient></defs>
    <path d="${body}" fill="#2a1c10" opacity=".45" transform="translate(5 8)" filter="url(#dk-cast)"/>
    <path d="${body}" fill="url(#${id})"/>${ridges}
    <path d="${edge}" fill="none" stroke="#e2a22c" stroke-width="${f1(r * 0.13)}" stroke-linejoin="round"/>
    <path d="${edge}" fill="none" stroke="#7a4f12" stroke-width="1.6" opacity=".8" transform="scale(1.035)"/>
    <path d="M${f1(Math.cos(a1) * r * 0.3)} ${f1(Math.sin(a1) * r * 0.3)} L${P(pts[n])}" stroke="#b58a55" stroke-width="2.5"/>
  </g>`;
}

function shavings(x: number, y: number): string {
  seed = 41;
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i < 26; i++) s += `<circle cx="${f1(R(-120, 120))}" cy="${f1(R(-50, 90))}" r="${R(0.8, 2.4).toFixed(1)}" fill="#3a3a3a" opacity="${R(0.25, 0.5).toFixed(2)}"/>`;
  s += shaving(-70, 10, 62, 20) + shaving(55, 40, 48, 150, 220) + shaving(10, -55, 40, -70, 200);
  for (let i = 0; i < 7; i++) s += `<path d="M${f1(R(-130, 130))} ${f1(R(-70, 90))} q6 -8 14 -2" stroke="#e2a22c" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  return s + '</g>';
}

function eraser(x: number, y: number, rot: number): string {
  // a worn pink wedge eraser: lit top face, darker sides, one rubbed-down corner, crumbs
  seed = 88;
  let crumbs = '';
  for (let i = 0; i < 9; i++) {
    const cx = R(-150, 150);
    const cy = R(60, 130);
    const q = `q${R(6, 12).toFixed(1)} ${R(-6, 6).toFixed(1)} ${R(14, 22).toFixed(1)} 0`;
    const sw = R(4, 7).toFixed(1);
    crumbs += `<path d="M${f1(cx + 2)} ${f1(cy + 3)} ${q}" stroke="#2a1c10" stroke-opacity=".35" stroke-width="${sw}" fill="none" stroke-linecap="round" filter="url(#dk-cast)"/>
      <path d="M${f1(cx)} ${f1(cy)} ${q}" stroke="${rnd() < 0.5 ? '#d9918c' : '#8e8a86'}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${crumbs}
    <path d="M-100 -36 L96 -36 L108 34 L-104 52Z" fill="#2a1c10" opacity=".45" transform="translate(8 14)" filter="url(#dk-cast)"/>
    <path d="M-92 -22 L78 -22 Q96 -22 100 -4 L104 30 L-104 30 L-100 -4 Q-96 -22 -92 -22Z" fill="#c9726d"/>
    <path d="M-104 30 L104 30 L100 48 L-100 48Z" fill="#a85752"/>
    <path d="M-90 -40 L70 -40 Q92 -38 96 -22 L-96 -22 Q-100 -36 -90 -40Z" fill="#f2aaa3"/>
    <path d="M-96 -22 L96 -22 L100 -4 L-100 -4Z" fill="#e6918a"/>
    <path d="M-80 -36 L40 -36" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 -40 Q90 -40 96 -22 L100 -4 Q70 -16 52 -40Z" fill="#8e8a86" opacity=".55"/>
  </g>`;
}

function paperclip(x: number, y: number, rot: number): string {
  const d = 'M0 0 L0 90 A22 22 0 0 0 44 90 L44 -10 A16 16 0 0 0 12 -10 L12 80';
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="${d}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="7" stroke-linecap="round" transform="translate(5 7)" filter="url(#dk-soft)"/>
    <path d="${d}" fill="none" stroke="#7d848c" stroke-width="7.5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#c4cad0" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6" stroke-linecap="round" transform="translate(-1 -1)"/>
  </g>`;
}

const mug = (x: number, y: number) => `<g transform="translate(${x} ${y})" filter="url(#dk-shadow)">
  <rect x="150" y="-26" width="120" height="52" rx="26" fill="none" stroke="#e8e1d4" stroke-width="26"/>
  <circle r="190" fill="#e8e1d4"/><circle r="160" fill="#cfc6b6"/><circle r="150" fill="url(#dk-coffee)"/>
  <ellipse cx="-50" cy="-60" rx="60" ry="20" fill="#fff" opacity=".12" transform="rotate(-30)"/></g>`;

let deskCache = '';
/** the desk with everything lying on it (built once) */
export const deskSVG = (): string => {
  if (deskCache) return deskCache;
  deskCache = planks() +
    looseSheet(-1330, -160, 620, 820, -11, {ruled: true, margin: true, writing: true, fold: true, grime: 1, grimeX: 300}) +
    looseSheet(-1420, 560, 600, 800, 7, {ruled: true, writing: true, stain: [430, 520], tint: '#ece2cb', grime: 2, grimeX: 340}) +
    looseSheet(1020, 820, 560, 740, 14, {ruled: true, writing: true, margin: true, tint: '#f1e9d6'}) +
    mug(-1330, 1430) + shavings(1185, 930) + pencil(1080, 180, 72, 560) + crumpled(1215, 40, 105) +
    eraser(1190, 1230, -18) + paperclip(-1150, 230, 24);
  return deskCache;
};

/** darkens the frame's edges, drawn over everything */
export const VIGNETTE = `<rect x="-2400" y="-1000" width="4800" height="3400" fill="url(#dk-vignette)" pointer-events="none"/>`;

/* ---------------- the book's boards ---------------- */

/** a board outline with the outer corners rounded and the spine side square (sx: +1 right, -1 left) */
export const boardPath = (sx: 1 | -1) => {
  const x1 = sx * BW;
  const r = 22;
  const y1 = BY + BH;
  return `M0 ${BY} L${x1 - sx * r} ${BY} Q${x1} ${BY} ${x1} ${BY + r} L${x1} ${y1 - r} Q${x1} ${y1} ${x1 - sx * r} ${y1} L0 ${y1}Z`;
};

/** a brass corner protector, flush with the leather and rounded like the board's corner */
const brassCorner = (cx: number, cy: number, sx: number, sy: number) => {
  const L = 92;
  const r = 22;
  const d = `M${cx + sx * r} ${cy} L${cx + sx * L} ${cy} L${cx} ${cy + sy * L} L${cx} ${cy + sy * r} Q${cx} ${cy} ${cx + sx * r} ${cy}Z`;
  return `<path d="${d}" fill="#000" opacity=".35" transform="translate(2 3)" filter="url(#dk-cast)"/>
    <path d="${d}" fill="url(#dk-brass)"/>
    <path d="M${cx + sx * L} ${cy} L${cx + sx * r} ${cy} Q${cx} ${cy} ${cx} ${cy + sy * r} L${cx} ${cy + sy * L}" fill="none" stroke="#f3dfa4" stroke-width="5" opacity=".8"/>
    <path d="M${cx + sx * L} ${cy} L${cx} ${cy + sy * L}" stroke="#6e5220" stroke-width="2" opacity=".7"/>
    <circle cx="${cx + sx * 24}" cy="${cy + sy * 24}" r="5" fill="#5a4318"/><circle cx="${cx + sx * 23}" cy="${cy + sy * 23}" r="1.6" fill="#f3dfa4" opacity=".7"/>`;
};

/** one leather board, outside up: leather grain, scuffs, edge, stitching and its two brass corners.
 *  Everything is clipped to the board's outline, so nothing can reach past the leather. */
export const boardSVG = (sx: 1 | -1): string => {
  const x0 = Math.min(0, sx * BW);
  seed = sx > 0 ? 303 : 313;
  let scuffs = '';
  for (let i = 0; i < 10; i++) scuffs += `<ellipse cx="${f1(R(x0 + 30, x0 + BW - 30))}" cy="${f1(R(BY + 30, BY + BH - 30))}" rx="${f1(R(10, 60))}" ry="${f1(R(3, 10))}" fill="#e8c9a6" opacity="${R(0.05, 0.14).toFixed(2)}"/>`;
  const inset = (k: number) => `<rect x="${sx > 0 ? k : -BW + k}" y="${BY + k}" width="${BW - 2 * k}" height="${BH - 2 * k}" rx="${Math.max(4, 22 - k)}"`;
  const outer = sx > 0 ? BW : -BW;
  const cid = `dk-board${sx > 0 ? 'R' : 'L'}`;
  return `<clipPath id="${cid}"><path d="${boardPath(sx)}"/></clipPath>
    <g clip-path="url(#${cid})">
      <rect x="${x0}" y="${BY}" width="${BW}" height="${BH}" fill="${COVER}"/>
      <rect x="${x0}" y="${BY}" width="${BW}" height="${BH}" fill="#fff" filter="url(#dk-leather)"/>
      <rect x="${x0}" y="${BY}" width="${BW}" height="${BH}" fill="#fff" filter="url(#dk-pores)"/>${scuffs}
      ${inset(3)} fill="none" stroke="#c7976a" stroke-opacity=".45" stroke-width="5"/>
      ${inset(18)} fill="none" stroke="#e6c79c" stroke-opacity=".7" stroke-width="3.5" stroke-dasharray="14 10"/>
      ${brassCorner(outer, BY, -sx, 1)}${brassCorner(outer, BY + BH, -sx, -1)}
    </g>`;
};

/** the shadow of the open book on the desk: wide and soft, plus a tight dark line where it touches */
export const bookShadowSVG = (x: number, w: number) =>
  `<rect x="${x + 26}" y="${BY + 40}" width="${w}" height="${BH}" rx="22" fill="#0a0603" opacity=".7" filter="url(#dk-castWide)"/>
   <rect x="${x + 5}" y="${BY + 8}" width="${w}" height="${BH}" rx="22" fill="#0a0603" opacity=".75" filter="url(#dk-cast)"/>`;

/** the elastic band, fixed to the back board: it runs under the pages, so only its ends show */
export const BAND_SVG = `<rect x="${BAND_X}" y="${BY - 6}" width="36" height="${BH + 12}" rx="4" fill="url(#dk-band)" filter="url(#dk-soft)"/>`;

/** a satin ribbon marker coming out from between the pages at the foot of the spine; drawn under
 *  the pages, so only the tail hanging over the board and the desk shows */
export const RIBBON_SVG = (() => {
  const w = 32;
  const y0 = PH - 30;
  const d = `M${-w / 2} ${y0} C${-w / 2} ${y0 + 80} ${-w / 2 + 18} ${y0 + 150} ${-w / 2 + 26} ${y0 + 226} L10 ${y0 + 206} L${w / 2 + 24} ${y0 + 230} C${w / 2 + 18} ${y0 + 150} ${w / 2} ${y0 + 80} ${w / 2} ${y0}Z`;
  return `<clipPath id="dk-ribbon"><path d="${d}"/></clipPath>
    <path d="${d}" fill="#000" opacity=".3" transform="translate(3 5)"/>
    <path d="${d}" fill="url(#dk-satin)"/>
    <rect x="${-w / 2 - 2}" y="${y0}" width="${w + 4}" height="70" fill="url(#dk-ribbonIn)" clip-path="url(#dk-ribbon)"/>`;
})();

export {PAPER as DESK_PAPER, COVER_DARK};
