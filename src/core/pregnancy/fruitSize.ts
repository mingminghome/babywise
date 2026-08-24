/**
 * Playful produce-size comparisons by completed gestational week.
 * Fun only — not a clinical measurement. Mapping follows the common
 * week-by-week fruit/veggie guide used by pregnancy apps (BabyCenter).
 */

export const FRUIT_IDS = [
  'beginning',
  'poppy-seed',
  'sesame-seed',
  'lentil',
  'blueberry',
  'raspberry',
  'grape',
  'strawberry',
  'fig',
  'lime',
  'plum',
  'lemon',
  'apple',
  'avocado',
  'turnip',
  'bell-pepper',
  'pomegranate',
  'banana',
  'mango',
  'sweet-potato',
  'grapefruit',
  'corn',
  'acorn-squash',
  'spaghetti-squash',
  'cauliflower',
  'eggplant',
  'butternut-squash',
  'cabbage',
  'coconut',
  'papaya',
  'pineapple',
  'cantaloupe',
  'honeydew',
  'romaine',
  'swiss-chard',
  'mini-watermelon',
  'pumpkin',
  'watermelon',
] as const;

export type FruitId = (typeof FRUIT_IDS)[number];

/** Shared plush silhouettes — one drawing per shape, recolored per fruit. */
export type FruitShape =
  | 'tiny'
  | 'round'
  | 'oval'
  | 'berry'
  | 'heart'
  | 'pear'
  | 'long'
  | 'curve'
  | 'pepper'
  | 'butternut'
  | 'leafy'
  | 'romaine'
  | 'chard'
  | 'cauli'
  | 'lemon'
  | 'pineapple';

export type FruitExtra =
  | 'stem'
  | 'leaf'
  | 'calyx'
  | 'stripes'
  | 'net'
  | 'ribs'
  | 'seeds'
  | 'sprout'
  | 'florets'
  | 'layers'
  | 'hair'
  | 'husk'
  | 'greens'
  | 'crown'
  | 'cap'
  | 'cleft'
  | 'diamonds'
  | 'bumps'
  | 'veins'
  | 'fronds'
  | 'stems';

export type FruitLook = {
  shape: FruitShape;
  fill: string;
  fillDark: string;
  fillLight: string;
  accent: string;
  extras: readonly FruitExtra[];
};

const BY_WEEK: Record<number, FruitId> = {
  4: 'poppy-seed',
  5: 'sesame-seed',
  6: 'lentil',
  7: 'blueberry',
  8: 'raspberry',
  9: 'grape',
  10: 'strawberry',
  11: 'fig',
  12: 'lime',
  13: 'plum',
  14: 'lemon',
  15: 'apple',
  16: 'avocado',
  17: 'turnip',
  18: 'bell-pepper',
  19: 'pomegranate',
  20: 'banana',
  21: 'mango',
  22: 'sweet-potato',
  23: 'grapefruit',
  24: 'corn',
  25: 'acorn-squash',
  26: 'spaghetti-squash',
  27: 'cauliflower',
  28: 'eggplant',
  29: 'butternut-squash',
  30: 'cabbage',
  31: 'coconut',
  32: 'papaya',
  33: 'pineapple',
  34: 'cantaloupe',
  35: 'honeydew',
  36: 'romaine',
  37: 'swiss-chard',
  38: 'mini-watermelon',
  39: 'pumpkin',
  40: 'watermelon',
};

export const FRUIT_LOOKS: Record<FruitId, FruitLook> = {
  beginning: {
    shape: 'tiny',
    fill: '#f4e4d2',
    fillDark: '#e2c9b0',
    fillLight: '#fff8f0',
    accent: '#8fbf6a',
    extras: ['sprout'],
  },
  'poppy-seed': {
    shape: 'tiny',
    fill: '#4a3c42',
    fillDark: '#32282c',
    fillLight: '#6a5a60',
    accent: '#32282c',
    extras: [],
  },
  'sesame-seed': {
    shape: 'tiny',
    fill: '#ead7b4',
    fillDark: '#d4bc90',
    fillLight: '#f8eed8',
    accent: '#c4a878',
    extras: [],
  },
  lentil: {
    shape: 'tiny',
    fill: '#c98458',
    fillDark: '#a86840',
    fillLight: '#e0a878',
    accent: '#8a5030',
    extras: [],
  },
  blueberry: {
    shape: 'round',
    fill: '#6a78b8',
    fillDark: '#4e5a96',
    fillLight: '#8a96d0',
    accent: '#3e4a7a',
    extras: ['calyx'],
  },
  raspberry: {
    shape: 'berry',
    fill: '#d46a84',
    fillDark: '#b8506a',
    fillLight: '#e890a4',
    accent: '#9a3c58',
    extras: ['bumps'],
  },
  grape: {
    shape: 'round',
    fill: '#8a68b0',
    fillDark: '#6c4e90',
    fillLight: '#b090cc',
    accent: '#5a3c78',
    extras: ['stem'],
  },
  strawberry: {
    shape: 'heart',
    fill: '#e07070',
    fillDark: '#c45454',
    fillLight: '#f09090',
    accent: '#6aaa58',
    extras: ['leaf', 'seeds'],
  },
  fig: {
    shape: 'pear',
    fill: '#a07090',
    fillDark: '#845878',
    fillLight: '#c098b0',
    accent: '#6aaa58',
    extras: ['stem'],
  },
  lime: {
    shape: 'oval',
    fill: '#8fbf5a',
    fillDark: '#6e9a40',
    fillLight: '#b0d878',
    accent: '#5a822e',
    extras: [],
  },
  plum: {
    shape: 'round',
    fill: '#c45a82',
    fillDark: '#a04468',
    fillLight: '#dc7a9c',
    accent: '#6aaa58',
    extras: ['cleft', 'stem'],
  },
  lemon: {
    shape: 'lemon',
    fill: '#ead05c',
    fillDark: '#d4b43c',
    fillLight: '#f4e890',
    accent: '#c4a040',
    extras: [],
  },
  apple: {
    shape: 'round',
    fill: '#e07068',
    fillDark: '#c45450',
    fillLight: '#f09088',
    accent: '#6aaa58',
    extras: ['leaf', 'stem'],
  },
  avocado: {
    shape: 'pear',
    fill: '#7aaa58',
    fillDark: '#5e8c40',
    fillLight: '#9ccc74',
    accent: '#c4a07a',
    extras: [],
  },
  turnip: {
    shape: 'round',
    fill: '#f0e6da',
    fillDark: '#d8c8b8',
    fillLight: '#fff8f2',
    accent: '#c47aa0',
    extras: ['greens'],
  },
  'bell-pepper': {
    shape: 'pepper',
    fill: '#e05c5c',
    fillDark: '#c44444',
    fillLight: '#f08080',
    accent: '#5a9a48',
    extras: ['stem'],
  },
  pomegranate: {
    shape: 'round',
    fill: '#c44850',
    fillDark: '#a03038',
    fillLight: '#dc6870',
    accent: '#8a2830',
    extras: ['calyx'],
  },
  banana: {
    shape: 'curve',
    fill: '#f0d45c',
    fillDark: '#d8b83c',
    fillLight: '#f8e890',
    accent: '#8a6230',
    extras: ['stem'],
  },
  mango: {
    shape: 'pear',
    fill: '#e8a04a',
    fillDark: '#cc842e',
    fillLight: '#f4bc70',
    accent: '#6aaa58',
    extras: ['leaf'],
  },
  'sweet-potato': {
    shape: 'long',
    fill: '#d4894a',
    fillDark: '#b87038',
    fillLight: '#e8a86c',
    accent: '#8a5028',
    extras: [],
  },
  grapefruit: {
    shape: 'round',
    fill: '#e89090',
    fillDark: '#d07070',
    fillLight: '#f4b0b0',
    accent: '#c45050',
    extras: [],
  },
  corn: {
    shape: 'long',
    fill: '#f0d060',
    fillDark: '#d8b440',
    fillLight: '#f8e488',
    accent: '#8fbf5a',
    extras: ['husk'],
  },
  'acorn-squash': {
    shape: 'pear',
    fill: '#5a8f5a',
    fillDark: '#447044',
    fillLight: '#78ac78',
    accent: '#3a5c3a',
    extras: ['cap'],
  },
  'spaghetti-squash': {
    shape: 'long',
    fill: '#ead89a',
    fillDark: '#d4c078',
    fillLight: '#f4e8b8',
    accent: '#c4b068',
    extras: [],
  },
  cauliflower: {
    shape: 'cauli',
    fill: '#efe8dc',
    fillDark: '#d8d0c4',
    fillLight: '#fffaf4',
    accent: '#6aaa58',
    extras: ['florets', 'greens'],
  },
  eggplant: {
    shape: 'long',
    fill: '#6b4a8a',
    fillDark: '#523672',
    fillLight: '#8a68a8',
    accent: '#6aaa58',
    extras: ['cap'],
  },
  'butternut-squash': {
    shape: 'butternut',
    fill: '#e8c078',
    fillDark: '#c4944c',
    fillLight: '#f4dca0',
    accent: '#8a6230',
    extras: ['stem'],
  },
  cabbage: {
    shape: 'round',
    fill: '#7aaa6a',
    fillDark: '#5e8c50',
    fillLight: '#98c488',
    accent: '#4a7240',
    extras: ['layers'],
  },
  coconut: {
    shape: 'round',
    fill: '#c4a07a',
    fillDark: '#a8845e',
    fillLight: '#d8bc98',
    accent: '#8a6848',
    extras: ['hair'],
  },
  papaya: {
    shape: 'oval',
    fill: '#e8904a',
    fillDark: '#cc742e',
    fillLight: '#f4ac70',
    accent: '#6aaa58',
    extras: ['stem'],
  },
  pineapple: {
    shape: 'pineapple',
    fill: '#e8c04a',
    fillDark: '#cc9e2e',
    fillLight: '#f4d878',
    accent: '#5a9a48',
    extras: ['crown', 'diamonds'],
  },
  cantaloupe: {
    shape: 'round',
    fill: '#e8b878',
    fillDark: '#d09a58',
    fillLight: '#f4d09a',
    accent: '#c48848',
    extras: ['net'],
  },
  honeydew: {
    shape: 'round',
    fill: '#b8d48a',
    fillDark: '#96b86a',
    fillLight: '#d4e8ac',
    accent: '#7aaa50',
    extras: [],
  },
  romaine: {
    shape: 'romaine',
    fill: '#8fc86a',
    fillDark: '#6aaa4c',
    fillLight: '#c4e89a',
    accent: '#5a8c38',
    extras: ['veins', 'fronds'],
  },
  'swiss-chard': {
    shape: 'chard',
    fill: '#3e8a48',
    fillDark: '#2c6a36',
    fillLight: '#6ab058',
    accent: '#c44a6e',
    extras: ['stems', 'veins'],
  },
  'mini-watermelon': {
    shape: 'round',
    fill: '#5a9a58',
    fillDark: '#3e7a3e',
    fillLight: '#78b674',
    accent: '#2e5c2e',
    extras: ['stripes'],
  },
  pumpkin: {
    shape: 'round',
    fill: '#e8943a',
    fillDark: '#cc7620',
    fillLight: '#f4b060',
    accent: '#5a8f5a',
    extras: ['ribs', 'stem'],
  },
  watermelon: {
    shape: 'oval',
    fill: '#5a9a58',
    fillDark: '#3e7a3e',
    fillLight: '#78b674',
    accent: '#2e5c2e',
    extras: ['stripes'],
  },
};

/** Completed gestational weeks → fruit id (weeks 0–3 = forming). */
export function fruitIdForWeek(weeks: number): FruitId {
  if (!Number.isFinite(weeks) || weeks < 4) return 'beginning';
  if (weeks >= 40) return 'watermelon';
  return BY_WEEK[Math.floor(weeks)] ?? 'watermelon';
}

export function fruitLookForWeek(weeks: number): FruitLook & { id: FruitId } {
  const id = fruitIdForWeek(weeks);
  return { id, ...FRUIT_LOOKS[id] };
}

/** i18n key fragment: `poppy-seed` → `poppySeed`. */
export function fruitNameKey(id: FruitId): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
