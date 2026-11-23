// Prints the film length and, per section, how long the drawing runs vs. the narration.
import {FILMS, FPS, type Variant} from '../src/pencil/plan';
const {PLAN, TOTAL_FRAMES, VOICE_FRAMES} = FILMS[(process.env.VARIANT ?? 'long') as Variant];
console.log(`total ${(TOTAL_FRAMES / FPS).toFixed(1)}s`);
const marks = Object.entries(PLAN.marks).sort((a, b) => a[1] - b[1]);
marks.forEach(([m, f], i) => {
  const next = marks[i + 1]?.[1] ?? PLAN.end;
  const voice = PLAN.voice.filter((v) => v.start >= f && v.start < next).reduce((a, v) => a + (VOICE_FRAMES[v.id] ?? 0), 0);
  console.log(`${m.padEnd(8)} ${(f / FPS).toFixed(1).padStart(6)}s  section ${((next - f) / FPS).toFixed(1).padStart(5)}s  voice ${(voice / FPS).toFixed(1).padStart(5)}s  slack ${((next - f - voice) / FPS).toFixed(1).padStart(5)}s`);
});
