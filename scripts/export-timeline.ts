// Writes out/<story>/timeline.json: section start times (s) and total length, for the music brief.
import {writeFileSync, mkdirSync} from 'node:fs';
import {FILMS, FPS, type Variant} from '../src/pencil/plan';
import {STORY} from '../src/stories/current';
const VARIANT = (process.env.VARIANT ?? 'long') as Variant;
const {PLAN, TOTAL_FRAMES, OUTRO_START} = FILMS[VARIANT];
const FILE = `out/${STORY}/timeline${VARIANT === 'long' ? '' : '-' + VARIANT}.json`;
mkdirSync(`out/${STORY}`, {recursive: true});
const marks = Object.fromEntries(Object.entries(PLAN.marks).map(([k, f]) => [k, +(f / FPS).toFixed(2)]));
writeFileSync(FILE, JSON.stringify({total: +(TOTAL_FRAMES / FPS).toFixed(2), outro: +(OUTRO_START / FPS).toFixed(2), marks}, null, 2));
console.log(`wrote ${FILE}`);
