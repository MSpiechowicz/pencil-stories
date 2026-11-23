// Layout checker for the pencil page: finds text that collides with drawings or other text,
// and anything outside the page margins. Run: npx tsx scripts/check-layout.ts
import {getLength, getPointAtLength} from '@remotion/paths';
import {LONG, SHORT} from '../src/stories/current';
const {items: ITEMS, worldH: WORLD_H} = process.env.VARIANT === 'short' ? SHORT : LONG;
import {textWidth, type DrawItem} from '../src/pencil/draw';

type Box = {x0: number; y0: number; x1: number; y1: number; i: number; kind: 'text' | 'draw'; label: string};

const boxOf = (it: DrawItem, i: number): Box => {
  if (it.text !== undefined) {
    const size = it.size ?? 56;
    const x0 = it.center ? it.x! - textWidth(it) / 2 : it.x!;
    return {x0, y0: it.y! - size * 0.78, x1: x0 + textWidth(it), y1: it.y! + size * 0.22, i, kind: 'text', label: `"${it.text}"`};
  }
  const len = getLength(it.d!);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k <= 80; k++) {
    const p = getPointAtLength(it.d!, (len * k) / 80);
    if (!p) continue;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const m = (it.tube ?? it.w ?? 6.5) / 2;
  return {x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m, i, kind: 'draw', label: `path#${i} (${it.color ?? 'ink'})`};
};

const boxes = ITEMS.map(boxOf);
const inter = (a: Box, b: Box) => {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? {w, h} : null;
};
const problems: string[] = [];
const isRail = (b: Box) => b.x1 < 215 || (b.kind === 'draw' && b.x0 < 200 && b.y1 - b.y0 > 300);
const soft = (it: DrawItem) => (it.opacity ?? 1) < 0.5; // background shading

for (const t of boxes.filter((b) => b.kind === 'text')) {
  for (const o of boxes) {
    if (o.i === t.i || isRail(o) || soft(ITEMS[o.i])) continue;
    const hit = inter(t, o);
    if (!hit) continue;
    if (o.kind === 'text' && o.i < t.i) continue; // report each text pair once
    if (hit.h < 10 || hit.w < 10) continue; // touching
    // a label inside an object it names (sign, bill, calendar) is fine when it sits fully inside it
    const inside = o.kind === 'draw' && t.x0 >= o.x0 - 2 && t.x1 <= o.x1 + 2 && t.y0 >= o.y0 - 2 && t.y1 <= o.y1 + 2;
    if (inside) continue;
    problems.push(`y≈${Math.round(t.y0)}  text ${t.label} overlaps ${o.label} [${Math.round(o.x0)},${Math.round(o.y0)} → ${Math.round(o.x1)},${Math.round(o.y1)}] by ${Math.round(hit.w)}×${Math.round(hit.h)}px`);
  }
}
for (const b of boxes) {
  if (b.x0 < 100 || b.x1 > 1000) problems.push(`y≈${Math.round(b.y0)}  ${b.label} outside margins: x ${Math.round(b.x0)}..${Math.round(b.x1)}`);
  if (b.y1 > WORLD_H) problems.push(`${b.label} below the page end`);
}
console.log(problems.length ? problems.sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2))).join('\n') : 'layout OK');
console.log(`${ITEMS.length} items checked`);
