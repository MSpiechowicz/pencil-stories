// Exports a Missing Piece cut's timeline for the music: when the story turns and the total length,
// to out/missing-piece/timeline-<variant>.json (seconds). VARIANT=shorts (default) or youtube.
import {writeFileSync} from 'node:fs';
import {MISSING_PIECE_SHORT, MISSING_PIECE_YOUTUBE} from '../src/stories/missing-piece/film';

const variant = process.env.VARIANT ?? 'shorts';
const F = variant === 'youtube' ? MISSING_PIECE_YOUTUBE : MISSING_PIECE_SHORT;
const sec = (f: number) => +(f / 30).toFixed(2);
const b = F.S.beats;
const marks: Record<string, number> = {
  morning: sec(b.morning.start), complaint: sec(b.complaint.start), floor: sec(b.floor.start),
  backToStart: sec(b['back-to-start'].start), never: sec(b.never.start),
};
if (b.laundry) marks.laundry = sec(b.laundry.start);
if (b.pile1) marks.pile = sec(b.pile1.start);
if (b.recipe) marks.recipe = sec(b.recipe.start);
const out = {total: sec(F.total), outro: sec(F.S.end), marks};
writeFileSync(`out/missing-piece/timeline-${variant}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
