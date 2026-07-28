/** All BabyWise localStorage keys share this prefix for clean wipe. */
export const STORAGE_PREFIX = 'babywise_v1_';

export const STORAGE_KEYS = {
  profile: `${STORAGE_PREFIX}profile`,
  events: `${STORAGE_PREFIX}events`,
  settings: `${STORAGE_PREFIX}settings`,
  askHistory: `${STORAGE_PREFIX}ask_history`,
  /** ISO timestamp when user accepted first-visit medical/privacy disclaimer */
  disclaimerAck: `${STORAGE_PREFIX}disclaimer_ack`,
} as const;
