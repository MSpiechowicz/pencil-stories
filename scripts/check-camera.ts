// Camera comfort check: no upward moves, gentle speed/acceleration, pencil always on screen.
// Run: npx tsx scripts/check-camera.ts
import {FILMS, FPS, type Variant} from '../src/pencil/plan';
const {CAMERA, PLAN, OUTRO_START} = FILMS[(process.env.VARIANT ?? 'long') as Variant];
import {pencilAt} from '../src/pencil/draw';
import {HOOK_H} from '../src/pencil/Hook';

let ups = 0;
let maxV = 0;
let maxA = 0;
let offscreen = 0;
let worstScreen = {lo: 1, hi: 0};
for (let f = 1; f < OUTRO_START; f++) {
  const v = CAMERA[f] - CAMERA[f - 1];
  if (v < -0.01) ups++;
  maxV = Math.max(maxV, Math.abs(v));
  if (f > 1) maxA = Math.max(maxA, Math.abs(v - (CAMERA[f - 1] - CAMERA[f - 2])));
  const p = pencilAt(PLAN.slots, f, {x: 1250, y: CAMERA[f] + 1700 - HOOK_H});
  if (p && p.x < 1100) {
    const s = (p.y + HOOK_H - CAMERA[f]) / 1920;
    worstScreen = {lo: Math.min(worstScreen.lo, s), hi: Math.max(worstScreen.hi, s)};
    if (s < 0.05 || s > 0.95) offscreen++;
  }
}
console.log(`upward moves: ${ups}`);
console.log(`max speed: ${(maxV * FPS).toFixed(0)} px/s, max accel: ${(maxA * FPS * FPS).toFixed(0)} px/s²`);
console.log(`pencil screen range: ${(worstScreen.lo * 100).toFixed(0)}%..${(worstScreen.hi * 100).toFixed(0)}% of height, frames near/over edge: ${offscreen}`);
