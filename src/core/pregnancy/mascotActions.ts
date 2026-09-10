/**
 * Mascot Action & Reaction Module.
 * Extensible action system with mood-specific pools, cycling reactions per click,
 * and body-shape adaptations (curve, long, butternut, chard, etc.).
 */
import { useEffect, useRef, useState } from 'react';
import type { FruitId, FruitShape } from './fruitSize';
import type { MascotMood } from './mascot';

export type MascotActionId =
  // Ambient continuous moods
  | 'idle'
  | 'sleep'
  | 'walk'
  | 'smile'
  // Sleep reactions (waking up & sleepy responses)
  | 'wake-wave'
  | 'sleepy-wiggle'
  | 'sleepy-peek'
  // Walk reactions (morning walking responses)
  | 'walk-hop'
  | 'walk-march'
  | 'walk-wave'
  // Smile reactions (daytime responses)
  | 'cheer-wave'
  | 'wiggle-dance'
  | 'bounce-hop';

export interface MascotActionDefinition {
  id: MascotActionId;
  /** Duration in milliseconds. 0 means continuous ambient mood. */
  durationMs: number;
  /** Effective facial mood while performing this action. */
  faceMood: MascotMood;
  /** Waving arm motion type. */
  armMotion?: 'droopy' | 'gentle' | 'walk' | 'rapid-wave' | 'double-wave' | 'dance' | 'reach-up';
  /** Body bounce type. */
  bounceType?: 'bounce' | 'hop' | 'wiggle' | 'none';
}

/** Pre-configured action registry. Adding any new action is simple and modular. */
export const MASCOT_ACTIONS: Record<MascotActionId, MascotActionDefinition> = {
  idle: {
    id: 'idle',
    durationMs: 0,
    faceMood: 'smile',
    armMotion: 'gentle',
    bounceType: 'none',
  },
  sleep: {
    id: 'sleep',
    durationMs: 0,
    faceMood: 'sleep',
    armMotion: 'droopy',
    bounceType: 'none',
  },
  walk: {
    id: 'walk',
    durationMs: 0,
    faceMood: 'walk',
    armMotion: 'walk',
    bounceType: 'none',
  },
  smile: {
    id: 'smile',
    durationMs: 0,
    faceMood: 'smile',
    armMotion: 'gentle',
    bounceType: 'none',
  },

  // --- Sleep reaction pool ---
  'wake-wave': {
    id: 'wake-wave',
    durationMs: 4000,
    faceMood: 'smile',
    armMotion: 'rapid-wave',
    bounceType: 'bounce',
  },
  'sleepy-wiggle': {
    id: 'sleepy-wiggle',
    durationMs: 3400,
    faceMood: 'smile',
    armMotion: 'gentle',
    bounceType: 'wiggle',
  },
  'sleepy-peek': {
    id: 'sleepy-peek',
    durationMs: 3600,
    faceMood: 'smile',
    armMotion: 'rapid-wave',
    bounceType: 'hop',
  },

  // --- Walk reaction pool ---
  'walk-hop': {
    id: 'walk-hop',
    durationMs: 2800,
    faceMood: 'walk',
    armMotion: 'reach-up',
    bounceType: 'hop',
  },
  'walk-march': {
    id: 'walk-march',
    durationMs: 3000,
    faceMood: 'walk',
    armMotion: 'walk',
    bounceType: 'bounce',
  },
  'walk-wave': {
    id: 'walk-wave',
    durationMs: 3200,
    faceMood: 'smile',
    armMotion: 'double-wave',
    bounceType: 'bounce',
  },

  // --- Smile reaction pool ---
  'cheer-wave': {
    id: 'cheer-wave',
    durationMs: 3200,
    faceMood: 'smile',
    armMotion: 'double-wave',
    bounceType: 'bounce',
  },
  'wiggle-dance': {
    id: 'wiggle-dance',
    durationMs: 3000,
    faceMood: 'smile',
    armMotion: 'dance',
    bounceType: 'wiggle',
  },
  'bounce-hop': {
    id: 'bounce-hop',
    durationMs: 2800,
    faceMood: 'smile',
    armMotion: 'rapid-wave',
    bounceType: 'hop',
  },
};

/** Reaction pools categorized by ambient mood */
export const MOOD_REACTION_POOLS: Record<MascotMood, MascotActionId[]> = {
  sleep: ['wake-wave', 'sleepy-wiggle', 'sleepy-peek'],
  walk: ['walk-hop', 'walk-march', 'walk-wave'],
  smile: ['cheer-wave', 'wiggle-dance', 'bounce-hop'],
};

/** Body-shape-specific motion modifiers so movements fit unique silhouettes. */
export interface ShapeMotionModifier {
  /** Relative scale of arm swings (e.g. smaller for slender bodies, wider for bulky shapes). */
  armSwingScale: number;
  /** Tilt angle offset in degrees for asymmetrical shapes (e.g. banana curve). */
  tiltDeg: number;
  /** CSS class to tailor keyframes per body shape. */
  shapeClass: string;
}

export function getShapeMotionModifier(shape: FruitShape): ShapeMotionModifier {
  switch (shape) {
    case 'curve':
      // Banana: crescent shape, tailored arm swing avoiding the spine
      return { armSwingScale: 0.88, tiltDeg: -4, shapeClass: 'shape-curve' };
    case 'long':
      // Sweet potato, eggplant, spaghetti squash, corn: slender vertical bodies
      return { armSwingScale: 0.85, tiltDeg: 0, shapeClass: 'shape-long' };
    case 'butternut':
      // Butternut squash: wide bulbous base, arms swing outward
      return { armSwingScale: 1.12, tiltDeg: 0, shapeClass: 'shape-butternut' };
    case 'chard':
      // Swiss chard: leafy crown with stalks below
      return { armSwingScale: 0.95, tiltDeg: -8, shapeClass: 'shape-chard' };
    case 'romaine':
      // Tall narrow lettuce head
      return { armSwingScale: 0.82, tiltDeg: -6, shapeClass: 'shape-romaine' };
    case 'cauli':
      // Fluffy curd cloud
      return { armSwingScale: 1.05, tiltDeg: -4, shapeClass: 'shape-cauli' };
    case 'tiny':
      // Little seeds: energetic micro-swings
      return { armSwingScale: 1.25, tiltDeg: 0, shapeClass: 'shape-tiny' };
    default:
      // Round, oval, pear, pepper, etc.
      return { armSwingScale: 1, tiltDeg: 0, shapeClass: 'shape-standard' };
  }
}

/**
 * Determine the reaction triggered by clicking a mascot,
 * cycling through different reactions per mood and varied across fruits.
 */
export function getClickAction(
  ambientMood: MascotMood,
  clickCount: number,
  fruitId?: FruitId
): MascotActionId {
  const pool = MOOD_REACTION_POOLS[ambientMood] ?? MOOD_REACTION_POOLS.smile;
  const fruitHash = fruitId
    ? fruitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 0;
  const index = (clickCount + fruitHash) % pool.length;
  return pool[index];
}

export interface UseMascotActionResult {
  currentAction: MascotActionId;
  activeMood: MascotMood;
  isReacting: boolean;
  shapeModifier: ShapeMotionModifier;
  trigger: (actionId?: MascotActionId) => void;
  actionDef: MascotActionDefinition;
}

/**
 * React hook to manage mascot actions, temporary reactions, and shape dynamics.
 */
export function useMascotAction(
  ambientMood: MascotMood,
  shape: FruitShape,
  fruitId?: FruitId
): UseMascotActionResult {
  const [transientAction, setTransientAction] = useState<MascotActionId | null>(null);
  const clickCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const trigger = (requestedAction?: MascotActionId) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const actionId =
      requestedAction ?? getClickAction(ambientMood, clickCountRef.current++, fruitId);
    const def = MASCOT_ACTIONS[actionId] ?? MASCOT_ACTIONS['cheer-wave'];

    setTransientAction(actionId);

    if (def.durationMs > 0) {
      timerRef.current = setTimeout(() => {
        setTransientAction(null);
      }, def.durationMs);
    }
  };

  const currentAction = transientAction ?? ambientMood;
  const actionDef = MASCOT_ACTIONS[currentAction] ?? MASCOT_ACTIONS[ambientMood];
  const isReacting = transientAction != null;
  const activeMood = actionDef.faceMood;
  const shapeModifier = getShapeMotionModifier(shape);

  return {
    currentAction,
    activeMood,
    isReacting,
    shapeModifier,
    trigger,
    actionDef,
  };
}
