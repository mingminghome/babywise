import type {
  BabyHairColor,
  BabyProfile,
  BabySex,
  BabySkinTone,
  CalendarEvent,
} from '../types';
import { mascotMoodAt, type MascotMood } from '../pregnancy/mascot';

const DEFAULT_WEIGHT_KG = 3.3;
const DEFAULT_LENGTH_CM = 50;

export type BornBabyLook = {
  skin: string;
  skinLight: string;
  skinDark: string;
  blush: string;
  onesie: string;
  onesieDark: string;
  onesieLight: string;
  hair: string;
  hairNone: boolean;
  accent: string;
  /** Overall draw size in px. */
  displayPx: number;
  /** 0.75–1.25 body width vs height. */
  chubby: number;
  /** 0.85–1.2 height stretch. */
  tall: number;
  sex: BabySex;
  weightKg: number;
  lengthCm: number;
};

const SKIN: Record<
  BabySkinTone,
  { skin: string; skinLight: string; skinDark: string; blush: string }
> = {
  fair: {
    skin: '#fbe4d6',
    skinLight: '#fff6ef',
    skinDark: '#e8c9b6',
    blush: '#f5c0c4',
  },
  light: {
    skin: '#f3d4c4',
    skinLight: '#fae6dc',
    skinDark: '#e0b8a4',
    blush: '#f4b4b8',
  },
  medium: {
    skin: '#e0b089',
    skinLight: '#edc9a8',
    skinDark: '#c4926e',
    blush: '#e08a8e',
  },
  tan: {
    skin: '#c48a62',
    skinLight: '#d4a07a',
    skinDark: '#a86c48',
    blush: '#d07a78',
  },
  deep: {
    skin: '#8d5a3c',
    skinLight: '#a87250',
    skinDark: '#6b3f2a',
    blush: '#c06a68',
  },
};

export const SKIN_SWATCH: Record<BabySkinTone, string> = {
  fair: '#fbe4d6',
  light: '#f3d4c4',
  medium: '#e0b089',
  tan: '#c48a62',
  deep: '#8d5a3c',
};

export const HAIR_SWATCH: Record<BabyHairColor, string> = {
  black: '#1c1412',
  dark_brown: '#3a241c',
  brown: '#6b4433',
  blonde: '#d4b07a',
  red: '#b85a38',
  none: '#eeddd4',
};

const HAIR: Record<BabyHairColor, string> = {
  black: '#1c1412',
  dark_brown: '#3a241c',
  brown: '#6b4433',
  blonde: '#d4b07a',
  red: '#b85a38',
  none: '#d8b8a8',
};

const ACCENT: Record<BabySex, string> = {
  girl: '#e8a0a8',
  boy: '#7aa8c8',
  unspecified: '#d4a574',
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function latestIndicatorValue(
  events: CalendarEvent[],
  babyId: string,
  kind: 'weight' | 'length' | 'head_circumference'
): number | undefined {
  const list = events
    .filter(
      (e) =>
        e.babyId === babyId &&
        e.type === 'indicator' &&
        e.indicator?.kind === kind
    )
    .toSorted((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
  const v = list[0]?.indicator?.value;
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function resolveBabyMeasures(
  baby: BabyProfile,
  events: CalendarEvent[]
): { weightKg: number; lengthCm: number; fromLogs: boolean } {
  const logW = latestIndicatorValue(events, baby.id, 'weight');
  const logL = latestIndicatorValue(events, baby.id, 'length');
  const weightKg = logW ?? baby.birthWeightKg ?? DEFAULT_WEIGHT_KG;
  const lengthCm = logL ?? baby.birthLengthCm ?? DEFAULT_LENGTH_CM;
  return {
    weightKg: clamp(weightKg, 1.4, 16),
    lengthCm: clamp(lengthCm, 38, 100),
    fromLogs: logW != null || logL != null,
  };
}

export function bornBabyLook(
  baby: BabyProfile,
  events: CalendarEvent[]
): BornBabyLook {
  const sex: BabySex = baby.sex ?? 'unspecified';
  const { weightKg, lengthCm } = resolveBabyMeasures(baby, events);
  const skinTone: BabySkinTone = baby.skinTone ?? 'light';
  const hairColor: BabyHairColor = baby.hairColor ?? 'brown';
  const skin = SKIN[skinTone] ?? SKIN.light;
  const expectedW = lengthCm / 15;
  const chubby = clamp(0.82 + (weightKg / expectedW - 1) * 0.45, 0.78, 1.28);
  const tall = clamp(0.86 + (lengthCm - 50) / 120, 0.84, 1.22);
  const displayPx = Math.round(clamp(118 + (weightKg - 2.4) * 10, 112, 198));
  return {
    ...skin,
    onesie: '#e8c4a8',
    onesieDark: '#c49a78',
    onesieLight: '#f3ddd0',
    hair: HAIR[hairColor] ?? HAIR.brown,
    hairNone: hairColor === 'none',
    accent: ACCENT[sex] ?? ACCENT.unspecified,
    displayPx,
    chubby,
    tall,
    sex,
    weightKg,
    lengthCm,
  };
}

export function bornBabyMood(sleeping: boolean, date = new Date()): MascotMood {
  if (sleeping) return 'sleep';
  return mascotMoodAt(date);
}
