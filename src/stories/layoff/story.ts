// "Laid Off: 20 Years" — one continuous page. A timeline rail runs down the left side,
// the story is written beside it and the scenes are drawn along it, top to bottom,
// by a single pencil. Marks connect the drawing to narration.json.
// Style: ink-cartoon stick figures (stick.ts) + matching ink objects (art.ts), one line weight.
import type {DrawItem} from '../../pencil/draw';
import {
  AMBER, DESK_TOP, INK, LIGHT, PAPER, RED, books, box, calendar, chairBackrest, check, clock, cloud, desk, door,
  envelope, heart, house, lamp, laptop, laptopBack, moon, mug, paperSheet, photoFrame, plant, sign, sun, windowFrame,
} from '../../pencil/art';
import {crowdRow, marks, stick, tinyStick} from '../../pencil/stick';
import {circ, place, rr, shadeEllipse, shadeRect} from '../../pencil/geo';

export const RAIL_X = 170;
export const markFirst = (items: DrawItem[], mark: string): DrawItem[] => items.map((it, k) => (k ? it : {...it, mark}));
export const TX = 240; // text column start

export const T = (text: string, x: number, y: number, size = 58, color = INK, mark?: string): DrawItem => ({text, x, y, size, color, mark});
export const rail = (y0: number, y1: number, extra: Partial<DrawItem> = {}): DrawItem => ({
  d: `M${RAIL_X} ${y0} C${RAIL_X + 14} ${y0 + (y1 - y0) * 0.33} ${RAIL_X - 14} ${y0 + (y1 - y0) * 0.66} ${RAIL_X} ${y1}`,
  w: 6.5, ...extra,
});
export const dot = (y: number, color = INK): DrawItem => ({d: circ(RAIL_X, y, 11), color, fill: color, w: 5});
export const label = (text: string, y: number, color = INK): DrawItem => ({text, x: RAIL_X + 24, y: y + 14, size: 42, color});

/* -------- icons for the "world changing" timeline -------- */
export const crt = (x: number, y: number): DrawItem[] => [
  {d: place(rr(-90, -70, 180, 130, 14), {x, y})},
  // screen on the left, a control strip on the right with two knobs centred in it
  {d: place(rr(-76, -54, 126, 96, 22), {x, y}), w: 4.5},
  {d: place('M-34 60 L-46 84 L46 84 L34 60', {x, y})},
  {d: place(`${circ(70, -19, 7)} ${circ(70, 7, 7)}`, {x, y}), w: 4.5},
];
export const phone = (x: number, y: number): DrawItem[] => [
  {d: place(rr(-44, -84, 88, 168, 14), {x, y})},
  {d: place(rr(-34, -66, 68, 116, 4), {x, y}), w: 4.5},
  {d: place(`${rr(-12, -77, 24, 5, 2)} ${circ(0, 66, 7)}`, {x, y}), w: 4.5},
];
export const cloudIcon = (x: number, y: number): DrawItem[] => [
  {d: cloud(x, y - 4, 190, 110)},
  {d: place('M0 30 L0 -22 M-18 -6 L0 -24 L18 -6', {x, y}), w: 6},
];
export const chip = (x: number, y: number): DrawItem[] => [
  {d: place(rr(-62, -62, 124, 124, 12), {x, y}), color: RED},
  {d: place(rr(-40, -40, 80, 80, 6), {x, y}), color: RED, w: 4.5},
  {d: place('M-30 -62 L-30 -82 M0 -62 L0 -82 M30 -62 L30 -82 M-30 62 L-30 82 M0 62 L0 82 M30 62 L30 82 M-62 -30 L-82 -30 M-62 0 L-82 0 M-62 30 L-82 30 M62 -30 L82 -30 M62 0 L82 0 M62 30 L82 30', {x, y}), color: RED, w: 5, speed: 120},
  {text: 'AI', x: x - 4.5, y: y + 14.5, size: 46, color: RED, center: true}, // optical centre (the hand font slants right)
];

/* -------- the anxiety spiral: part of the one life-line --------
 * One Fermat double spiral (r = a·u, angle = u², u from -U to U): it winds in, passes through the
 * centre in a smooth S and winds back out between its own loops, so it never crosses itself and has
 * no joint in the middle. It is rotated/mirrored so the line enters at the left edge moving down and
 * leaves at the right edge moving down, then sweeps back under the spiral to rejoin the rail. */
export const doubleSpiral = (cx: number, cy: number, R: number, _r1: number, turns: number, fromY: number, rejoinY: number) => {
  const U = Math.sqrt(turns * Math.PI * 2);
  const A = R / U;
  const make = (mirror: number) => {
    const C = (u: number) => [A * u * Math.cos(u * u), mirror * A * u * Math.sin(u * u)];
    const V = (u: number) => [A * Math.cos(u * u) - 2 * A * u * u * Math.sin(u * u), mirror * (A * Math.sin(u * u) + 2 * A * u * u * Math.cos(u * u))];
    const s0 = C(-U);
    const rot = Math.PI - Math.atan2(s0[1], s0[0]); // put the start on the left edge
    const R2 = (v: number[]) => [v[0] * Math.cos(rot) - v[1] * Math.sin(rot), v[0] * Math.sin(rot) + v[1] * Math.cos(rot)];
    return {C, V, R2};
  };
  let m = make(1);
  if (m.R2(m.V(-U))[1] < 0) m = make(-1); // must be moving down at the entry
  const n = Math.round(turns * 160);
  const pts: number[][] = [];
  for (let k = 0; k <= n; k++) {
    const u = -U + (2 * U * k) / n;
    const q = m.R2(m.C(u));
    pts.push([cx + q[0], cy + q[1] * 0.8]);
  }
  const f = (v: number[]) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  const first = pts[0];
  const last = pts[pts.length - 1];
  let d = `M${RAIL_X} ${fromY} C${RAIL_X} ${fromY + 240} ${first[0]} ${first[1] - 160} ${f(first)}`;
  for (const q of pts.slice(1)) d += ` L${f(q)}`;
  // arrive at the rail travelling straight down, so it continues into the rail without a corner
  d += ` C${last[0]} ${last[1] + 0.8 * R + 150} ${RAIL_X} ${rejoinY - 150} ${RAIL_X} ${rejoinY}`;
  return d;
};

/* -------- bills stack -------- */
/** HIRING sign label, centred on the sign's inner panel (offsets measured from the rendered ink) */
export const SIGN_TX = 888;
export const SIGN_TY = -16;
export const BILL_BASE = 38; // baseline above the sheet bottom: centred between the top edge and the ruled lines
export const BILLS = ['MORTGAGE', 'CAR LOAN', 'CREDIT CARD', 'GROCERIES', 'ELECTRICITY', "KIDS' DOCTOR"];
export const bills = (x: number, ground: number, names: string[] = BILLS): DrawItem[] =>
  names.flatMap((name, i) => {
    const y = ground - i * 92;
    const dx = i % 2 ? 10 : -8;
    const size = 40;
    return [
      ...paperSheet({x: x + dx, y, s: 0.85, speed: 90}, 2),
      {text: name, x: x + dx, y: y - BILL_BASE, size, color: i === names.length - 1 ? RED : INK, center: true},
    ];
  });

/** A little sun that fits in one window pane (rays stay inside the frame). */
const smallSun = (x: number, y: number): DrawItem[] => {
  const rays = Array.from({length: 8}, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return `M${x + Math.cos(a) * 15} ${y + Math.sin(a) * 15} L${x + Math.cos(a) * 22} ${y + Math.sin(a) * 22}`;
  }).join(' ');
  return [{d: circ(x, y, 10), color: AMBER, w: 5}, {d: rays, color: AMBER, w: 4}];
};

/** Desk seen from the front with a person sitting behind it (face visible above the laptop). */
export const deskScene = (o: {x: number; ground: number; mood: 'smile' | 'determined'; tie?: boolean; night?: boolean}): DrawItem[] => {
  const top = o.ground - DESK_TOP;
  const personY = top + 98; // seated: shoulders and tie show above the laptop
  return [
    ...windowFrame({x: o.x + 250, y: top - 150, s: 0.8}),
    // moon / sun sit inside the window's top-right pane (pane centre: frame x + 38, frame y - 96 at s 0.8)
    ...(o.night
      ? [moon(o.x + 250 + 42, top - 150 - 96, 0.62), ...clock(o.x - 250, top - 225, 0.9, 1, 10)]
      : smallSun(o.x + 250 + 38, top - 150 - 96)),
    {d: `M${TX} ${o.ground} L980 ${o.ground}`},
    ...chairBackrest({x: o.x, y: personY - 92}),
    ...stick({x: o.x, y: personY, pose: 'atDesk', mood: o.mood, tie: o.tie, badge: o.tie}),
    ...desk({x: o.x + 60, y: o.ground}),
    ...laptopBack({x: o.x, y: top, s: 0.62}),
    ...(o.night
      ? [...lamp({x: o.x - 165, y: top, s: 0.85}), ...books({x: o.x + 210, y: top, s: 0.65})]
      : [...photoFrame({x: o.x - 190, y: top}), heart(o.x - 190, top - 62, 0.45), ...mug({x: o.x + 170, y: top}), ...plant({x: o.x + 250, y: top, s: 0.85})]),
  ];
};

/* ================================ the page ================================ */
export const ITEMS: DrawItem[] = [
  // ---------- Year 1 ----------
  dot(300), {...T('Year 1.', TX, 340, 130, INK, 'start'), pause: 24},
  T('A desk. A badge. A dream.', TX, 450, 62),
  rail(300, 1000),
  ...deskScene({x: 560, ground: 1000, mood: 'smile', tie: true}),

  // ---------- 20 years ----------
  {...rail(1000, 1190), mark: 'years'}, dot(1190), label('Y5', 1190), ...crt(420, 1190),
  T('For 20 years,', 600, 1220, 60),
  rail(1190, 1370), dot(1370), label('Y10', 1370), ...phone(420, 1370),
  T('the world kept', 600, 1400, 60),
  rail(1370, 1550), dot(1550), label('Y15', 1550), ...cloudIcon(420, 1550),
  T('changing.', 600, 1580, 60),
  rail(1550, 1740), dot(1740, RED), label('Y20', 1740, RED), ...chip(420, 1740),
  T('He kept', 600, 1720, 60), T('showing up.', 600, 1790, 60),

  // ---------- the email ----------
  rail(1740, 1920), dot(1920, RED), T('Then one email.', TX, 1950, 84, INK, 'email'),
  ...laptop({x: 600, y: 2320}),
  ...envelope({x: 600, y: 2240, s: 0.72}),
  {d: circ(668, 2136, 18), color: RED, fill: RED},
  T('“Due to AI restructuring,', TX, 2420, 54),
  T('your position has been', TX, 2488, 54),
  T('eliminated.”', TX, 2574, 76, RED),
  {d: `M${TX} 2596 C${TX + 120} 2586 ${TX + 260} 2602 ${TX + 360} 2590`, color: RED, w: 6.5},

  // ---------- the break ----------
  // the crack ends in the section dot, level with its heading (like every other section)
  {d: `M${RAIL_X} 1920 L${RAIL_X} 2560 L150 2590 L194 2620 L146 2650 L192 2680 L${RAIL_X} 2710`, w: 6.5, mark: 'box', speed: 90},
  dot(2710), T('20 years.', TX, 2740, 100),
  T('One cardboard box.', TX, 2840, 62),
  {d: `M${TX} 3200 L980 3200`},
  ...box({x: 500, y: 3200}),
  ...stick({x: 830, y: 3200, mood: 'crushed'}),
  marks(900, 2890, 0.9),

  // ---------- the market ----------
  rail(2710, 3300), dot(3300), T('He started searching.', TX, 3330, 72, INK, 'market'),
  T('So did thousands of', TX, 3410, 56), T('skilled people.', TX, 3475, 56),
  ...[3720, 3800, 3880].flatMap((g, row) =>
    crowdRow(Array.from({length: 7}, (_, k) => 300 + k * 66 + (row % 2) * 32), g, 0.42, INK, 900)),
  ...tinyStick(270, 3960, 0.42, RED, 100),
  ...door({x: 890, y: 3880, s: 0.75}),
  ...sign({x: 890, y: 3640, s: 0.8}),
  {text: 'HIRING: 1', x: SIGN_TX, y: 3640 + SIGN_TY, size: 30, color: RED, center: true},
  T('214 applications. 0 replies.', TX, 4070, 54),

  // ---------- the bills ----------
  rail(3300, 4160), dot(4160), T('The bills never paused.', TX, 4190, 70, INK, 'bills'),
  ...bills(470, 4800),
  ...stick({x: 830, y: 4800, pose: 'despair', mood: 'worried'}),
  marks(905, 4440, 0.9),

  // ---------- months / spiral ----------
  rail(4160, 4880), dot(4880), T('Months passed.', TX, 4920, 88, INK, 'months'),
  T('No answers.', TX, 5010, 62),
  ...calendar({x: 850, y: 5140, s: 0.9}),
  // calendar at y 5140, s 0.9: header band 4960..5005, page 5005..5140
  // positions measured from the rendered ink (Caveat glyphs are not optically centred)
  {text: 'MONTH', x: 847, y: 4992, size: 30, center: true},
  {text: '7', x: 836, y: 5100, size: 104, color: RED, center: true},
  {d: doubleSpiral(560, 5300, 200, 18, 2.2, 4880, 5600), w: 6, speed: 75},
  T('His thoughts went in circles.', TX, 5680, 58),

  // ---------- the lowest night ----------
  rail(5600, 5760), dot(5760), T('One night, alone in the dark,', TX, 5790, 58, INK, 'night'),
  T('he felt he had nothing left.', TX, 5860, 58),
  {d: shadeRect(TX, 5930, 980, 6410, 26), w: 4, opacity: 0.25, speed: 1100},
  {d: `M${TX} 6410 L980 6410`},
  {d: 'M318 6410 L318 6130'},
  ...stick({x: 350, y: 6410, pose: 'slump', mood: 'crushed'}),
  {d: cloud(470, 6020, 330, 130), fill: PAPER},
  {d: shadeEllipse(470, 6035, 170, 66, 12), clip: cloud(470, 6020, 330, 130), w: 4, opacity: 0.8, speed: 160},
  {d: Array.from({length: 8}, (_, k) => `M${350 + k * 32} ${6120 + (k % 3) * 14} l-12 36`).join(' '), w: 4.5, speed: 120},
  ...door({x: 860, y: 6410, s: 0.85}, true),
  {d: 'M778 6180 L720 6150 M778 6260 L712 6260 M778 6340 L720 6370', color: AMBER, w: 5},
  ...stick({x: 860, y: 6410, child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'worried'}),
  {...T('“Daddy, are you okay?”', TX, 6510, 66, RED), mark: 'voice'},

  // ---------- family: the reason ----------
  rail(5760, 6620, {color: RED}), dot(6620, RED), T('He remembered', TX, 6660, 84, INK, 'family'),
  T('who he was fighting for.', TX, 6750, 66, RED),
  {d: `M${TX} 7330 L980 7330`},
  ...house({x: 790, y: 7330, s: 0.85}, true),
  ...markFirst(stick({x: 310, y: 7330, pose: 'holdHands', hair: 'long', skirt: true, color: RED, mood: 'smile'}), 'familyb'),
  ...stick({x: 470, y: 7330, pose: 'holdFamily', mood: 'smile'}),
  ...stick({x: 590, y: 7330, pose: 'reachUp', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'smile'}),
  heart(370, 6930, 1), heart(570, 6905, 0.8),

  // ---------- relentless self-improvement ----------
  rail(6620, 7460), dot(7460, AMBER), T('Every night, after bedtime,', TX, 7490, 58, INK, 'study'),
  T('he learned. He built. He grew.', TX, 7560, 58),
  ...deskScene({x: 560, ground: 8130, mood: 'determined', night: true}),
  T('Day 1 → Day 180', TX, 8240, 56, AMBER),
  check(TX + 20, 8300), T('Learned new AI tools', TX + 60, 8320, 52),
  check(TX + 20, 8375), T('Earned 3 certificates', TX + 60, 8395, 52),
  check(TX + 20, 8450), T('Built a real portfolio', TX + 60, 8470, 52),

  // ---------- 5 AM ----------
  rail(7460, 8570), dot(8570, AMBER), T('5 AM. Every single day.', TX, 8600, 72, INK, 'run'),
  {d: `M${TX} 8990 L980 8990`},
  ...sun(850, 8910, 56),
  ...stick({x: 520, y: 8990, pose: 'run', mood: 'determined'}),
  {d: 'M370 8790 L310 8790 M382 8840 L294 8840 M370 8890 L320 8890', w: 4.5, opacity: 0.6},
  T('Stronger body. Stronger mind.', TX, 9080, 56),

  // ---------- out-work the competition ----------
  rail(8570, 9140), dot(9140), T('Thousands applied.', TX, 9170, 74, INK, 'compete'),
  T('He prepared like none of them.', TX, 9250, 58),
  ...[9520, 9590].flatMap((g, row) =>
    crowdRow(Array.from({length: 6}, (_, k) => 290 + k * 66 + row * 32), g, 0.4, INK, 900)),
  {d: 'M770 9340 L740 9310 M820 9322 L820 9290 M870 9340 L900 9310', color: AMBER, w: 5},
  ...stick({x: 830, y: 9680, pose: 'handOnHip', mood: 'smile', tie: true}),
  T('He heard “no” again and again.', TX, 9790, 56, INK, 'no'),
  T('NO', 280, 9880, 64, RED), T('NO', 430, 9860, 64, RED), T('NO', 580, 9890, 64, RED), T('NO', 730, 9870, 64, RED),
  T('Every no made him sharper.', TX, 9975, 58),

  // ---------- yes ----------
  rail(9140, 10040), dot(10040, RED), {...T('Then, another email.', TX, 10070, 80, INK, 'yes'), pause: 36},
  ...laptop({x: 600, y: 10440}),
  ...envelope({x: 600, y: 10360, s: 0.72}, RED),
  check(668, 10260, 1.4, AMBER),
  T('“We’d like to offer you the role.”', TX, 10540, 48, RED),

  // ---------- home ----------
  rail(10040, 10640, {color: RED}), dot(10640, RED), {...T('Bad days end.', TX, 10680, 104, INK, 'end'), pause: 45},
  {...T('No storm lasts forever.', TX, 10790, 68, INK, 'end2'), pause: 21},
  {d: `M${TX} 11300 L980 11300`},
  ...sun(880, 10930, 50),
  ...house({x: 790, y: 11300, s: 0.8}, true),
  ...stick({x: 310, y: 11300, pose: 'cheer', hair: 'long', skirt: true, color: RED, mood: 'grin'}),
  ...stick({x: 460, y: 11300, pose: 'cheer', mood: 'grin'}),
  ...stick({x: 590, y: 11300, pose: 'cheer', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'grin'}),
  marks(380, 10930, 0.9, RED), marks(560, 10950, 0.9, RED),
  rail(10640, 11300, {color: RED}),
  {...heart(RAIL_X, 11290, 1.1), mark: 'outro'},
];

export const WORLD_H = 11440;
export {PAPER, LIGHT};
