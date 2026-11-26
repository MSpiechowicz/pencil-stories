// Release art for "Day One. Again.": the 16:9 YouTube thumbnail and the 9:16 Shorts/Reels cover.
// Same paper, ink and drawings as the film: its "Day one. Again." March calendar (two days, the
// fall, the new day one circled in red) and him beside it, ready to start again.
//   npx remotion still DayOneThumb out/day-one/thumbnail-16x9.png
//   npx remotion still DayOneCover out/day-one/cover-9x16.png
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {INK, PAPER, RED} from '../../pencil/art';
import {HAND_FONT} from '../../pencil/fonts';
import {Strokes} from '../../pencil/Journey';
import {staticSlots} from '../../pencil/Hook';
import {ellipse} from '../../pencil/geo';
import type {DrawItem} from '../../pencil/draw';
import {man, wallCalendar} from './story';

const BG: React.CSSProperties = {backgroundColor: PAPER};

const Ink: React.FC<{w: number; h: number; items: DrawItem[]}> = ({w, h, items}) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{position: 'absolute', inset: 0}}>
    <Strokes frame={0} slots={staticSlots(items)} />
  </svg>
);

const Title: React.FC<{size: number; align: 'left' | 'center'}> = ({size, align}) => (
  <div style={{fontFamily: HAND_FONT, fontWeight: 700, lineHeight: 0.95, textAlign: align}}>
    <div style={{fontSize: size, color: INK}}>Day One.</div>
    <div style={{fontSize: size, color: RED, marginTop: size * 0.08}}>Again.</div>
  </div>
);

// exactly the film's "Day one. Again." page: March 1st and 2nd, the fall on the 3rd, and day one
// again on the 4th (March 2026 starts on a Sunday), circled here
const RUNS = {strokes: [0, 1], crosses: [2]};
const NEW_DAY = 3, MARCH_START = 6;
/** the calendar at (x, y), w wide, with the new day one stroked and circled */
const calendar = (x: number, y: number, w: number): DrawItem[] => {
  const cell = w / 7, band = cell * 0.9, k = MARCH_START + NEW_DAY;
  const cx = x + (k % 7) * cell + cell / 2, cy = y + band + Math.floor(k / 7) * cell + cell / 2;
  return [
    ...wallCalendar(x, y, w, {month: 'MARCH', strokes: [...RUNS.strokes, NEW_DAY], crosses: RUNS.crosses}),
    {d: ellipse(cx, cy, cell * 0.46, cell * 0.44), color: RED, w: 6},
  ];
};

/** 16:9 YouTube thumbnail (1280x720): big title left, the calendar and him right. */
export const DayOneThumb: React.FC = () => (
  <AbsoluteFill style={BG}>
    <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 72}}>
      <Title size={150} align="left" />
    </AbsoluteFill>
    <Ink w={1280} h={720} items={[
      ...calendar(640, 120, 420),
      ...man(1170, 640, {pose: 'stand', mood: 'determined', s: 0.78}),
      {d: 'M620 640 L1260 640', w: 6},
    ]} />
  </AbsoluteFill>
);

/** 9:16 cover for Shorts / Reels (1080x1920); everything important inside Instagram's centre
 *  3:4 crop (y 240..1680). */
export const DayOneCover: React.FC = () => (
  <AbsoluteFill style={BG}>
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 290}}>
      <Title size={190} align="center" />
    </AbsoluteFill>
    <Ink w={1080} h={1920} items={[
      ...calendar(110, 760, 600),
      ...man(870, 1500, {pose: 'stand', mood: 'determined', s: 1.05}),
      {d: 'M90 1500 L990 1500', w: 6},
    ]} />
    <AbsoluteFill style={{alignItems: 'center', top: 1560}}>
      <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: 60, color: INK}}>Starting over is not starting from zero.</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
