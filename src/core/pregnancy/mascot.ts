/**
 * Shared mascot model: week → fruit, visual scale, mood, and body path.
 * The React view only renders these parts (shadow, body, pattern, limbs, face).
 */
import {
  fruitLookForWeek,
  type FruitId,
  type FruitLook,
  type FruitShape,
} from './fruitSize';

export type MascotMood = 'walk' | 'smile' | 'sleep';

export type MascotAnchor = { x: number; y: number };

export type MascotLayout = {
  armL: MascotAnchor;
  armR: MascotAnchor;
  legL: MascotAnchor;
  legR: MascotAnchor;
};

export const MASCOT_GROUND_Y = 172;
export const MASCOT_ARM_LEN = 16;
export const MASCOT_LEG_LEN = 18;

export const MASCOT_FALLBACK_LAYOUT: MascotLayout = {
  armL: { x: -32, y: 8 },
  armR: { x: 32, y: 8 },
  legL: { x: -12, y: 42 },
  legR: { x: 12, y: 42 },
};

/** 6–12 walk, 12–21 smile, 21–6 sleep (local clock). */
export function mascotMoodAt(date: Date = new Date()): MascotMood {
  const hour = date.getHours();
  if (hour >= 21 || hour < 6) return 'sleep';
  if (hour < 12) return 'walk';
  return 'smile';
}

/**
 * Relative size vs a week-40 watermelon. Seeds stay small; growth
 * accelerates after the first trimester.
 */
export function visualScaleForWeek(weeks: number): number {
  const w = Math.min(40, Math.max(0, weeks));
  const t = w / 40;
  const eased = t < 0.3 ? t * 0.7 : 0.21 + (t - 0.3) * (0.79 / 0.7);
  return 0.34 + 0.66 * Math.min(1, Math.max(0, eased));
}

export function mascotDisplayPx(weeks: number): number {
  const s = visualScaleForWeek(weeks);
  return Math.round(100 + 100 * ((s - 0.34) / 0.66));
}

function ellipseD(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx},${cy}a${rx},${ry} 0 1 0 ${rx * 2},0a${rx},${ry} 0 1 0 ${-rx * 2},0z`;
}

export function bodyPathD(shape: FruitShape): string {
  switch (shape) {
    case 'tiny':
      return ellipseD(0, 4, 30, 28);
    case 'oval':
      return ellipseD(0, 2, 40, 52);
    case 'heart':
      return 'M0-38c-22-16-48-2-48 22 0 28 48 54 48 54s48-26 48-54c0-24-26-38-48-22z';
    case 'pear':
      return 'M0-44c-16 0-26 14-26 30 0 14-10 28-10 42 0 20 16 32 36 32s36-12 36-32c0-14-10-28-10-42 0-16-10-30-26-30z';
    case 'long':
      return ellipseD(0, 4, 30, 54);
    case 'curve':
      // Classic banana crescent: outer bulge, inner C, stem on the top tip.
      return 'M14-48c22-4 38 28 34 60-4 24-20 38-38 38-8 0-8-10 0-20 14-18 16-46 10-66-2-8-4-12-6-12z';
    case 'pepper':
      // Boxy bell pepper — rounded rectangle, stem sits in a shallow top dip.
      return 'M-28-30c-8 0-10 10-10 24v18c0 14 10 24 38 24s38-10 38-24v-18c0-14-2-24-10-24-8 8-18 10-28 10s-20-2-28-10z';
    case 'butternut':
      // Cylindrical neck into a fat bulb (classic butternut bottle).
      return 'M0-54c-20 0-24 8-24 24 0 14 2 22 6 28-18 4-30 16-30 32 0 16 18 26 48 26s48-10 48-26c0-16-12-28-30-32 4-6 6-14 6-28 0-16-4-24-24-24z';
    case 'romaine':
      // Packed upright head: capsule of leaves with a flat cut base.
      return 'M-20-46c0-10 8-16 20-16s20 6 20 16v58c0 10-8 16-20 16s-20-6-20-16z';
    case 'chard':
      // Leaf cluster only (high) — red stalks are accessories below.
      return 'M0-44c-24-4-40 10-36 28 2 12 14 22 24 24 6 2 12 2 12 2s6 0 12-2c10-2 22-12 24-24 4-18-12-32-36-28z';
    case 'lemon':
      // Wide lemon body with small sharp nubs (not a thin diamond).
      return 'M0-36c24 8 40 24 40 44 0 20-16 34-34 38l-6 8-6-8c-18-4-34-18-34-38 0-20 16-36 40-44z';
    case 'leafy':
      return 'M0-56c-12-2-20 10-22 28-2 20 2 40 10 50 6 8 12 10 12 10s6-2 12-10c8-10 12-30 10-50-2-18-10-30-22-28z';
    case 'pineapple':
      return 'M0-36c-28 8-40 28-40 52s16 48 40 52c24-4 40-28 40-52S28-28 0-36z';
    case 'cauli':
      // Bumpy curd cloud (florets in the outline).
      return 'M-10-30c-12-12-32-4-36 12-6 12 2 22-4 32 6 14 22 22 38 20 12 8 28 2 36-10 10-4 16-16 12-28 4-16-10-28-26-28-4-8-14-12-20-2z';
    case 'berry':
      return 'M0-40c-18-4-38 8-42 28-4 18 6 36 20 46 10 8 16 18 22 18s12-10 22-18c14-10 24-28 20-46-4-20-24-32-42-28z';
    default:
      return ellipseD(0, 0, 50, 48);
  }
}

function xRangeAtY(
  el: SVGGeometryElement,
  y: number,
  band: number
): { minX: number; maxX: number } | null {
  const len = el.getTotalLength();
  if (!len) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  const n = 128;
  for (let i = 0; i <= n; i++) {
    const p = el.getPointAtLength((len * i) / n);
    if (Math.abs(p.y - y) <= band) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
  }
  if (!Number.isFinite(minX) || maxX - minX < 2) return null;
  return { minX, maxX };
}

/** Plant limbs on the real silhouette (works for tapers, fans, bottles). */
export function anchorsFromGeometry(
  el: SVGGeometryElement,
  shape?: FruitShape
): MascotLayout | null {
  const bbox = el.getBBox();
  if (bbox.width < 4 || bbox.height < 4) return null;

  const band = Math.max(3, bbox.height * 0.045);
  const shoulderY = bbox.y + bbox.height * 0.4;
  const shoulder =
    xRangeAtY(el, shoulderY, band) ?? {
      minX: bbox.x + 2,
      maxX: bbox.x + bbox.width - 2,
    };

  const minHipWidth = Math.max(10, Math.min(18, bbox.width * 0.2));
  let hip: { minX: number; maxX: number } | null = null;
  let hipY = bbox.y + bbox.height * 0.86;
  for (let t = 0.08; t <= 0.4; t += 0.02) {
    hipY = bbox.y + bbox.height * (1 - t);
    hip = xRangeAtY(el, hipY, band);
    if (hip && hip.maxX - hip.minX >= minHipWidth) break;
  }
  if (!hip) {
    hipY = bbox.y + bbox.height * 0.78;
    hip = {
      minX: bbox.x + bbox.width * 0.38,
      maxX: bbox.x + bbox.width * 0.62,
    };
  }

  const drop =
    shape === 'chard' || shape === 'cauli' ? 16 : shape === 'romaine' ? 8 : 0;
  const gather = shape === 'chard' ? 8 : null;

  return {
    armL: { x: shoulder.minX + 1.2, y: shoulderY },
    armR: { x: shoulder.maxX - 1.2, y: shoulderY },
    legL: {
      x: gather != null ? -gather : hip.minX + 1,
      y: hipY + drop,
    },
    legR: {
      x: gather != null ? gather : hip.maxX - 1,
      y: hipY + drop,
    },
  };
}

/**
 * One mascot instance for a gestational week: fruit, mood, scale, path.
 */
export class FruitMascot {
  readonly week: number;
  readonly look: FruitLook & { id: FruitId };
  readonly mood: MascotMood;
  readonly scale: number;
  readonly displayPx: number;

  constructor(week: number, now: Date = new Date()) {
    this.week = Number.isFinite(week) ? Math.max(0, week) : 0;
    this.look = fruitLookForWeek(this.week);
    this.mood = mascotMoodAt(now);
    this.scale = visualScaleForWeek(this.week);
    this.displayPx = mascotDisplayPx(this.week);
  }

  get id(): FruitId {
    return this.look.id;
  }

  get shape(): FruitShape {
    return this.look.shape;
  }

  bodyD(): string {
    return bodyPathD(this.look.shape);
  }

  /** Face sits on the produce, not at a global origin. */
  facePose(): { x: number; y: number; scale: number } {
    switch (this.look.id) {
      case 'banana':
        return { x: 22, y: 8, scale: 0.62 };
      case 'swiss-chard':
        return { x: 0, y: -20, scale: 0.88 };
      default:
        return { x: 0, y: 0, scale: 1 };
    }
  }

  /** Slight turn so layered veggies read in 3/4 instead of flat-on. */
  tiltDeg(): number {
    switch (this.look.id) {
      case 'romaine':
        return -12;
      case 'swiss-chard':
        return -14;
      case 'cauliflower':
        return -10;
      default:
        return 0;
    }
  }
}
