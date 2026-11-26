// A small test book for the page turns: an ordinary turn, a riffle forward, a block back, a block
// forward and a riffle back, with a drawing on every page so the first and last sheets of each
// turn can be checked against the pages under them. Render it as the "BookLab" composition.
import type {DrawItem} from '../pencil/draw';
import {INK, RED} from '../pencil/art';
import {stick} from '../pencil/stick';
import {schedule, type Step} from './timeline';
import type {BookFilm} from './Book';

const T = (text: string, x: number, y: number, size = 72, color = INK): DrawItem => ({text, x, y, size, color});
const pageOf = (n: number, side: 'left' | 'right'): DrawItem[] => [
  T(`Spread ${n}`, 160, 260, 96, side === 'left' ? INK : RED),
  T(side === 'left' ? 'left page' : 'right page', 160, 380, 60),
  ...stick({x: 520, y: 1000, s: 1.1, mood: n % 2 ? 'smile' : 'neutral'}),
];
const at = (id: string, spread: number, extra: Partial<Step> = {}): Step =>
  ({id, spread, hold: 30, speed: 3, left: pageOf(spread, 'left'), right: pageOf(spread, 'right'), ...extra});

export const BOOK_LAB_STEPS: Step[] = [
  at('start', 0),
  at('turn', 1),
  at('riffle-forward', 6, {flipThrough: {sheets: 16, perSheet: 3, frames: 70}}),
  at('bulk-back', 1, {bulk: {frames: 54}, left: [], right: []}),
  at('bulk-forward', 6, {bulk: {frames: 54}, left: [], right: []}),
  at('riffle-back', 2, {flipThrough: {sheets: 12, perSheet: 3, frames: 60}}),
];

const S = schedule(BOOK_LAB_STEPS);
export const BOOK_LAB: BookFilm = {S, spreads: 7, outro: 30, total: S.end + 30, paper: 'margin'};
