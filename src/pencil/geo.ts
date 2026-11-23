// Path helpers for the line-art library: transform any SVG path (move / scale / rotate / mirror)
// and a few primitives. Everything is authored in local coordinates, then placed with `place`.

type Xf = {x?: number; y?: number; s?: number; rot?: number; flip?: boolean};

const ARGS: Record<string, number> = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Transform a path. Local origin is scaled (s), mirrored (flip), rotated (rot, degrees), then moved to (x, y). */
export const place = (d: string, {x = 0, y = 0, s = 1, rot = 0, flip = false}: Xf = {}): string => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const cos = Math.cos((rot * Math.PI) / 180);
  const sin = Math.sin((rot * Math.PI) / 180);
  const fx = flip ? -1 : 1;
  const vec = (px: number, py: number) => {
    const a = px * s * fx;
    const b = py * s;
    return [a * cos - b * sin, a * sin + b * cos];
  };
  const out: string[] = [];
  let i = 0;
  let cmd = '';
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
      out.push(cmd);
      if (cmd.toUpperCase() === 'Z') continue;
    }
    const up = cmd.toUpperCase();
    const abs = cmd === up;
    const n = ARGS[up];
    const a = tokens.slice(i, i + n).map(Number);
    i += n;
    let res: number[];
    if (up === 'H' || up === 'V') {
      // rotation would break H/V, so turn them into L
      const isH = up === 'H';
      const [vx, vy] = vec(isH ? a[0] : 0, isH ? 0 : a[0]);
      out[out.length - 1] === cmd ? out.pop() : null;
      out.push(abs ? 'L' : 'l');
      res = abs ? [NaN, NaN] : [vx, vy];
      if (abs) {
        // absolute H/V needs the current point; approximate by emitting relative from the transformed target is
        // not possible, so authors use L in rotated art. Fallback: treat as relative.
        res = [vx, vy];
        out[out.length - 1] = 'l';
      }
      out.push(res.map(r2).join(' '));
      continue;
    }
    if (up === 'A') {
      const [px, py] = vec(a[5], a[6]);
      res = [a[0] * s, a[1] * s, a[2] + rot, a[3], flip ? 1 - a[4] : a[4], abs ? px + x : px, abs ? py + y : py];
    } else {
      res = [];
      for (let k = 0; k < a.length; k += 2) {
        const [px, py] = vec(a[k], a[k + 1]);
        res.push(abs ? px + x : px, abs ? py + y : py);
      }
    }
    out.push(res.map(r2).join(' '));
  }
  return out.join(' ');
};

/** Rounded rectangle (local coordinates, x/y = top-left). */
export const rr = (x: number, y: number, w: number, h: number, r = 8) =>
  `M${x + r} ${y} L${x + w - r} ${y} A${r} ${r} 0 0 1 ${x + w} ${y + r} L${x + w} ${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} L${x + r} ${y + h} A${r} ${r} 0 0 1 ${x} ${y + h - r} L${x} ${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;

export const circ = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

/** Evenly spaced parallel lines (as one path). */
export const hLines = (x0: number, x1: number, y0: number, y1: number, n: number) =>
  Array.from({length: n}, (_, k) => {
    const y = y0 + ((y1 - y0) * k) / Math.max(1, n - 1);
    return `M${x0} ${y} L${x1} ${y}`;
  }).join(' ');

export const vLines = (y0: number, y1: number, x0: number, x1: number, n: number) =>
  Array.from({length: n}, (_, k) => {
    const x = x0 + ((x1 - x0) * k) / Math.max(1, n - 1);
    return `M${x} ${y0} L${x} ${y1}`;
  }).join(' ');

/** Zig-zag shading that stays inside an ellipse (for clouds, shadows). */
export const shadeEllipse = (cx: number, cy: number, rx: number, ry: number, step: number) => {
  let d = '';
  let left = true;
  for (let y = cy - ry + step / 2; y < cy + ry; y += step) {
    const k = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    const a = cx - rx * k;
    const b = cx + rx * k;
    d += d === '' ? `M${a} ${y}` : ` L${left ? a : b} ${y}`;
    d += ` L${left ? b : a} ${y + step * 0.5}`;
    left = !left;
  }
  return d;
};

/** Zig-zag shading inside a rectangle. */
export const shadeRect = (x0: number, y0: number, x1: number, y1: number, step: number) => {
  let d = `M${x0} ${y0}`;
  let right = true;
  for (let y = y0; y <= y1; y += step) {
    d += ` L${right ? x1 : x0} ${y + step / 2}`;
    right = !right;
  }
  return d;
};
