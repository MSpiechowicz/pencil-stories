// Music + narration.
// Music: an original score composed with Eleven Music (tools/eleven/music.py), cut to this
// video's section timings, so the emotional turns land on the story beats.
// Narration: ElevenLabs "Brian" (tools/eleven/narrate.py); each line starts where the drawing
// reaches its mark (see draw.ts `plan`).
import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {VOICE_LEAD, type Film} from './plan';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const voiceEnvelope = ({PLAN, VOICE_FRAMES}: Film, f: number) => {
  let env = 0;
  for (const v of PLAN.voice) {
    const d = VOICE_FRAMES[v.id] ?? 0;
    // ease down 0.4 s before the line, recover slowly (1.5 s) after it: no audible swoop
    env = Math.max(env, interpolate(f, [v.start - 12, v.start, v.start + d, v.start + d + 45], [0, 1, 1, 0], clamp));
  }
  return env;
};
// the score already breathes with the story, so ducking under the voice can be gentle
const duck = (film: Film, f: number) => 1 - 0.3 * voiceEnvelope(film, f);
// near-silence around the daughter's question ("voice" mark) until the family beat
const quiet = ({PLAN, def}: Film, f: number) => {
  const a = PLAN.marks.voice;
  const b = PLAN.marks.family;
  if (!def.quietAtVoice || a === undefined || b === undefined) return 1;
  return interpolate(f, [a - 20, a, b - 6, b + 24], [1, 0.3, 0.3, 1], clamp);
};

export const Soundtrack: React.FC<{film: Film}> = ({film}) => {
  const {PLAN, TOTAL_FRAMES, def} = film;
  return (
  <>
    {/* the score starts on the first frame, soft under the hook line */}
    <Sequence from={0} durationInFrames={TOTAL_FRAMES} name="Music: original score (Eleven Music)">
      <Audio
        src={staticFile(def.music)}
        volume={(f) => 0.9 * duck(film, f) * quiet(film, f) * interpolate(f, [0, 8, TOTAL_FRAMES - 60, TOTAL_FRAMES], [0, 1, 1, 0], clamp)}
      />
    </Sequence>
    {PLAN.voice.map((v) => (
      <Sequence key={v.id} from={Math.max(0, Math.round(v.start) - VOICE_LEAD)} name={`Voice ${v.id}`}>
        <Audio src={staticFile(`${def.voiceDir}/${v.id}.wav`)} />
      </Sequence>
    ))}
  </>
  );
};
