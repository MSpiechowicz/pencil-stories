// Release art for "The Missing Piece": the 16:9 YouTube thumbnail and the 9:16 Shorts/Reels cover.
// Same paper, ink and drawings as the film: her holding up the red missing piece to the puzzle.
//   npx remotion still MissingPieceThumb out/missing-piece/thumbnail-16x9.png
//   npx remotion still MissingPieceCover out/missing-piece/cover-9x16.png
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {INK, PAPER, RED} from '../../pencil/art';
import {HAND_FONT} from '../../pencil/fonts';
import {Strokes} from '../../pencil/Journey';
import {staticSlots} from '../../pencil/Hook';
import type {DrawItem} from '../../pencil/draw';
import {loosePiece, mom, puzzle} from './story';

const BG: React.CSSProperties = {backgroundColor: PAPER};

const Ink: React.FC<{w: number; h: number; items: DrawItem[]}> = ({w, h, items}) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{position: 'absolute', inset: 0}}>
    <Strokes frame={0} slots={staticSlots(items)} />
  </svg>
);

const Title: React.FC<{size: number; align: 'left' | 'center'}> = ({size, align}) => (
  <div style={{fontFamily: HAND_FONT, fontWeight: 700, lineHeight: 0.95, textAlign: align}}>
    <div style={{fontSize: size, color: INK}}>She does</div>
    <div style={{fontSize: size, color: INK}}>everything.</div>
    <div style={{fontSize: size * 0.86, color: RED, marginTop: size * 0.12}}>It's never enough.</div>
  </div>
);

/** 16:9 YouTube thumbnail (1280x720): big title left, the scene right. */
export const MissingPieceThumb: React.FC = () => (
  <AbsoluteFill style={BG}>
    <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 64}}>
      <Title size={112} align="left" />
    </AbsoluteFill>
    <Ink w={1280} h={720} items={[
      // the puzzle with its gap, top right; her below it, lifting the red piece towards the gap
      ...puzzle(700, 70, 110, 2),
      ...mom(1160, 650, {pose: 'cheer', mood: 'determined', s: 0.95}),
      ...loosePiece(1160, 280, 96, -8),
      {d: 'M760 650 L1250 650', w: 6},
      {d: 'M1102 236 C1080 200 1062 182 1050 170', color: RED, w: 5},
      {d: 'M1048 188 L1047 168 L1066 172', color: RED, w: 5},
    ]} />
  </AbsoluteFill>
);

/** 9:16 cover for Shorts / Reels (1080x1920); everything important inside Instagram's centre
 *  3:4 crop (y 240..1680). */
export const MissingPieceCover: React.FC = () => (
  <AbsoluteFill style={BG}>
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
      <Title size={170} align="center" />
    </AbsoluteFill>
    <Ink w={1080} h={1920} items={[
      ...puzzle(110, 960, 150, 2),
      ...mom(850, 1500, {pose: 'cheer', mood: 'determined', s: 1.15}),
      ...loosePiece(850, 1052, 124, -8),
      {d: 'M90 1500 L990 1500', w: 6},
      {d: 'M772 1010 C700 980 640 980 600 1000', color: RED, w: 6},
      {d: 'M618 984 L598 1001 L620 1016', color: RED, w: 6},
    ]} />
    <AbsoluteFill style={{alignItems: 'center', top: 1560}}>
      <div style={{fontFamily: HAND_FONT, fontWeight: 700, fontSize: 62, color: INK}}>What if she was never the missing piece?</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
