// "Laid Off" — the ~55 s cut for Shorts / Reels. Same page style and characters as story.ts,
// fewer and tighter scenes, drawn faster (speedScale in stories/current.ts).
import type {DrawItem} from '../../pencil/draw';
import {AMBER, DESK_TOP, INK, PAPER, RED, sun, calendar, check, cloud, door, envelope, heart, house, laptop, sign} from '../../pencil/art';
import {crowdRow, marks, stick, tinyStick} from '../../pencil/stick';
import {circ, shadeEllipse, shadeRect} from '../../pencil/geo';
import {RAIL_X, SIGN_TX, SIGN_TY, T, TX, bills, deskScene, dot, doubleSpiral, markFirst, rail} from './story';

export const ITEMS: DrawItem[] = [
  // ---------- 20 years at one desk ----------
  dot(300), {...T('Year 1.', TX, 340, 130, INK, 'start'), pause: 24},
  T('A desk. A badge. A dream.', TX, 450, 62),
  rail(300, 1000),
  ...deskScene({x: 560, ground: 1000, mood: 'smile', tie: true}),

  // ---------- the email ----------
  rail(1000, 1100), dot(1100, RED), T('Then one email.', TX, 1130, 84, INK, 'email'),
  ...laptop({x: 600, y: 1500}),
  ...envelope({x: 600, y: 1420, s: 0.72}),
  {d: circ(668, 1316, 18), color: RED, fill: RED},
  T('“Your position has been', TX, 1600, 54),
  T('eliminated.”', TX, 1686, 76, RED),
  {d: `M${TX} 1708 C${TX + 120} 1698 ${TX + 260} 1714 ${TX + 360} 1702`, color: RED, w: 6.5},

  // ---------- thousands like him, and the bills ----------
  {d: `M${RAIL_X} 1100 L${RAIL_X} 1720 L150 1760 L194 1800 L146 1840 L${RAIL_X} 1880`, w: 6.5, speed: 90},
  dot(1880), T('Thousands like him.', TX, 1910, 72, INK, 'crowd'),
  ...[2140, 2220].flatMap((g, row) => crowdRow(Array.from({length: 7}, (_, k) => 300 + k * 66 + row * 32), g, 0.42, INK, 900)),
  ...tinyStick(270, 2300, 0.42, RED, 100),
  ...door({x: 890, y: 2220, s: 0.75}),
  ...sign({x: 890, y: 1980, s: 0.8}),
  {text: 'HIRING: 1', x: SIGN_TX, y: 1980 + SIGN_TY, size: 30, color: RED, center: true},
  T('And the bills didn’t stop.', TX, 2400, 62, INK, 'bills'),
  ...bills(470, 2760, ['MORTGAGE', 'GROCERIES', "KIDS' DOCTOR"]),
  ...stick({x: 830, y: 2760, pose: 'despair', mood: 'worried'}),
  marks(935, 2470, 0.9),

  // ---------- months, the spiral ----------
  rail(1880, 2860), dot(2860), T('Months. No answers.', TX, 2900, 80, INK, 'months'),
  ...calendar({x: 850, y: 3110, s: 0.9}),
  {text: 'MONTH', x: 847, y: 3110 - 148, size: 30, center: true},
  {text: '7', x: 836, y: 3110 - 40, size: 104, color: RED, center: true},
  {d: doubleSpiral(560, 3290, 170, 16, 1.8, 2860, 3540), w: 6, speed: 75},

  // ---------- the lowest night ----------
  rail(3540, 3620), dot(3620), T('One night, he had nothing left.', TX, 3650, 54, INK, 'night'),
  {d: shadeRect(TX, 3720, 980, 4200, 26), w: 4, opacity: 0.25, speed: 1100},
  {d: `M${TX} 4200 L980 4200`},
  {d: 'M318 4200 L318 3920'},
  ...stick({x: 350, y: 4200, pose: 'slump', mood: 'crushed'}),
  {d: cloud(470, 3810, 330, 130), fill: PAPER},
  {d: shadeEllipse(470, 3825, 170, 66, 12), clip: cloud(470, 3810, 330, 130), w: 4, opacity: 0.8, speed: 160},
  {d: Array.from({length: 8}, (_, k) => `M${350 + k * 32} ${3910 + (k % 3) * 14} l-12 36`).join(' '), w: 4.5, speed: 120},
  ...door({x: 860, y: 4200, s: 0.85}, true),
  {d: 'M778 3970 L720 3940 M778 4050 L712 4050 M778 4130 L720 4160', color: AMBER, w: 5},
  ...stick({x: 860, y: 4200, child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'worried'}),
  {...T('“Daddy, are you okay?”', TX, 4300, 66, RED), mark: 'voice'},

  // ---------- family ----------
  rail(3620, 4410, {color: RED}), dot(4410, RED), {...T('He remembered', TX, 4450, 84, INK, 'family'), pause: 45},
  T('who he was fighting for.', TX, 4540, 66, RED),
  {d: `M${TX} 5120 L980 5120`},
  ...house({x: 790, y: 5120, s: 0.85}, true),
  ...stick({x: 310, y: 5120, pose: 'holdHands', hair: 'long', skirt: true, color: RED, mood: 'smile'}),
  ...stick({x: 470, y: 5120, pose: 'holdFamily', mood: 'smile'}),
  ...stick({x: 590, y: 5120, pose: 'reachUp', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'smile'}),
  heart(370, 4720, 1), heart(570, 4695, 0.8),

  // ---------- every night, every morning ----------
  rail(4410, 5250), dot(5250, AMBER), T('Every night, he learned.', TX, 5280, 62, INK, 'study'),
  ...deskScene({x: 560, ground: 5850, mood: 'determined', night: true}),
  {...T('Day 1 → Day 180', TX, 5960, 56, AMBER, 'skills'), pause: 6},
  check(TX + 20, 6020), T('Learned new AI tools', TX + 60, 6040, 52),
  check(TX + 20, 6095), T('Earned 3 certificates', TX + 60, 6115, 52),
  check(TX + 20, 6170), T('Built a real portfolio', TX + 60, 6190, 52),

  // ---------- no, no, no ----------
  rail(5250, 6300), dot(6300), T('He heard “no” again and again.', TX, 6330, 56, INK, 'no'),
  T('NO', 280, 6420, 64, RED), T('NO', 430, 6400, 64, RED), T('NO', 580, 6430, 64, RED), T('NO', 730, 6410, 64, RED),
  {...T('Every no made him sharper.', TX, 6520, 58, INK, 'sharper'), pause: 6},

  // ---------- yes ----------
  rail(6300, 6620), dot(6620, RED), {...T('Then, another email.', TX, 6650, 80, INK, 'yes'), pause: 30},
  ...laptop({x: 600, y: 7020}),
  ...envelope({x: 600, y: 6940, s: 0.72}, RED),
  check(668, 6840, 1.4, AMBER),
  T('“We’d like to offer you the role.”', TX, 7120, 48, RED),

  // ---------- ending ----------
  rail(6620, 7220, {color: RED}), dot(7220, RED), {...T('Bad days end.', TX, 7260, 104, INK, 'end'), pause: 45},
  {...T('No storm lasts forever.', TX, 7370, 68, INK, 'end2'), pause: 21},
  {d: `M${TX} 7880 L980 7880`},
  ...sun(880, 7880 - 370, 50),
  ...house({x: 790, y: 7880, s: 0.8}, true),
  ...stick({x: 310, y: 7880, pose: 'cheer', hair: 'long', skirt: true, color: RED, mood: 'grin'}),
  ...stick({x: 460, y: 7880, pose: 'cheer', mood: 'grin'}),
  ...stick({x: 590, y: 7880, pose: 'cheer', child: true, hair: 'pigtails', skirt: true, color: RED, mood: 'grin'}),
  rail(7220, 7880, {color: RED}),
  {...heart(RAIL_X, 7870, 1.1), mark: 'outro'},
];

export const WORLD_H = 8020;
void markFirst;
void check;
void DESK_TOP;
