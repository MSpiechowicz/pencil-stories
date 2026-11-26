// Mockup still: the mirror as in the film now (left pair) and the proposed one (right pair).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Strokes} from '../../pencil/Journey';
import {plan} from '../../pencil/draw';
import {PAPER} from '../../pencil/art';
import {mirrorCurrent, mirrorV2, storm} from './story';

const Panel: React.FC<{items: ReturnType<typeof mirrorV2>; label: string}> = ({items, label}) => {
  const p = plan(items, [], {});
  return (
    <div style={{position: 'relative', width: 480, height: 640}}>
      <svg viewBox="0 0 480 640" width={480} height={640}><Strokes frame={100000} slots={p.slots} /></svg>
      <div style={{position: 'absolute', bottom: 8, width: '100%', textAlign: 'center', font: '22px sans-serif', color: '#555'}}>{label}</div>
    </div>
  );
};
export const MirrorLab: React.FC = () => (
  <AbsoluteFill style={{background: PAPER, flexDirection: 'row'}}>
    <Panel items={mirrorCurrent(240, 290, true)} label="now: tired" />
    <Panel items={mirrorCurrent(240, 290, false)} label="now: clear" />
    <Panel items={mirrorV2(240, 290, true)} label="proposed: tired" />
    <Panel items={mirrorV2(240, 290, false)} label="proposed: clear" />
    <Panel items={storm(240, 220, 1)} label="proposed: storm cloud" />
  </AbsoluteFill>
);
