// Design sheet: every sticky-note style side by side, as a work note and as a red revisit note.
// npx remotion still NoteLab out/note-lab.png
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PAPER, RED, check} from './art';
import {NOTE_STYLES, note} from './notes';
import {plan} from './draw';
import {Strokes} from './Journey';
import {HAND_FONT} from './fonts';

export const NOTE_LAB = {w: 2400, h: 1000};
const COL = NOTE_LAB.w / NOTE_STYLES.length;

export const NoteLab: React.FC = () => {
  const items = NOTE_STYLES.flatMap((style, i) => {
    const cx = COL * (i + 0.5);
    return [
      ...note(cx, 330, ['PROJECT', 'DONE'], {w: 250, h: 200, rot: -4, size: 46, style}),
      check(cx + 82, 346, 1.3),
      ...note(cx, 700, ['She argues with you', 'because she feels', 'SAFE with you.'], {w: 400, h: 220, rot: 3, size: 42, color: RED, style}),
    ];
  });
  return (
    <AbsoluteFill style={{
      backgroundColor: PAPER,
      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 70px, #c3d3e8 70px, #c3d3e8 72px)',
    }}>
      {NOTE_STYLES.map((s, i) => (
        <div key={s} style={{position: 'absolute', left: COL * i, width: COL, top: 40, textAlign: 'center',
          fontFamily: HAND_FONT, fontWeight: 700, fontSize: 64, color: '#2f3338'}}>{i + 1}. {s}</div>
      ))}
      <svg viewBox={`0 0 ${NOTE_LAB.w} ${NOTE_LAB.h}`} width={NOTE_LAB.w} height={NOTE_LAB.h} style={{position: 'absolute', inset: 0}}>
        <Strokes frame={1e9} slots={plan(items, [], {}).slots} />
      </svg>
    </AbsoluteFill>
  );
};
