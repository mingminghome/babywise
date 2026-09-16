import { DEFAULT_ASK_CONTEXT, mergeContextFlags } from '../ai/askContext';
import { clampLaborHomeWeek, DEFAULT_LABOR_RULE, resolveLaborHomeMode } from '../labor/engine';
import type {
  AiProviderId,
  AppSettings,
  AskHistoryItem,
  BabyProfile,
  CalendarEvent,
  DataCategory,
  GestationalDisplayStyle,
  LaborRulePreset,
  LaborSession,
  Locale,
  PregnancyProfile,
} from '../types';
import {
  AI_PROVIDERS,
  DEFAULT_LABOR_HOME_WEEK,
  GESTATIONAL_DISPLAY_STYLES,
  LOCALES,
} from '../types';
import { STORAGE_KEYS, STORAGE_PREFIX } from './keys';

const LABOR_PRESETS: readonly LaborRulePreset[] = ['511', '411', 'custom'];

const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  theme: 'warm-light',
  gestationalDisplay: 'weeks_days',
  showMascot: true,
  showBabyMascot: true,
  homeMode: 'pregnancy',
  babyCareEnabled: false,
  hidePregnancy: false,
  laborRulePreset: '511',
  laborRuleCustom: { ...DEFAULT_LABOR_RULE },
  laborHomeMode: 'auto',
  laborHomeFromWeek: DEFAULT_LABOR_HOME_WEEK,
  ai: {
    provider: 'gemini',
    contextPrefs: { ...DEFAULT_ASK_CONTEXT },
  },
  /** Default on; browser permission still required to show alerts. */
  notificationsEnabled: true,
};

function normalizeLocale(raw: unknown): Locale {
  const s = String(raw ?? '');
  if ((LOCALES as readonly string[]).includes(s)) return s as Locale;
  return 'en';
}

function normalizeLaborPreset(raw: unknown): LaborRulePreset {
  const s = String(raw ?? '');
  if ((LABOR_PRESETS as readonly string[]).includes(s)) return s as LaborRulePreset;
  return '511';
}

function normalizeGestationalDisplay(raw: unknown): GestationalDisplayStyle {
  const s = String(raw ?? '');
  if ((GESTATIONAL_DISPLAY_STYLES as readonly string[]).includes(s)) {
    return s as GestationalDisplayStyle;
  }
  return 'weeks_days';
}

function normalizeProvider(raw: unknown): AiProviderId {
  const s = String(raw ?? '').toLowerCase();
  if ((AI_PROVIDERS as readonly string[]).includes(s)) return s as AiProviderId;
  return 'gemini';
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('BabyWise storage write failed:', e);
  }
}

export function getDefaultSettings(): AppSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

export function getProfile(): PregnancyProfile | null {
  return readJson<PregnancyProfile | null>(STORAGE_KEYS.profile, null);
}

export function saveProfile(profile: PregnancyProfile): void {
  writeJson(STORAGE_KEYS.profile, profile);
}

export function getEvents(): CalendarEvent[] {
  return readJson<CalendarEvent[]>(STORAGE_KEYS.events, []);
}

export function saveEvents(events: CalendarEvent[]): void {
  writeJson(STORAGE_KEYS.events, events);
}

export function getSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings> | null>(STORAGE_KEYS.settings, null);
  if (!stored) return getDefaultSettings();
  const base = getDefaultSettings();
  return {
    ...base,
    ...stored,
    gestationalDisplay: normalizeGestationalDisplay(stored.gestationalDisplay),
    showMascot: stored.showMascot !== false,
    showBabyMascot: stored.showBabyMascot !== false,
    homeMode: stored.homeMode === 'baby' || stored.hidePregnancy === true ? 'baby' : 'pregnancy',
    locale: normalizeLocale(stored.locale),
    babyCareEnabled: stored.babyCareEnabled === true,
    hidePregnancy: stored.hidePregnancy === true,
    activeBabyId:
      typeof stored.activeBabyId === 'string' && stored.activeBabyId
        ? stored.activeBabyId
        : undefined,
    laborRulePreset: normalizeLaborPreset(stored.laborRulePreset),
    laborRuleCustom: stored.laborRuleCustom
      ? { ...DEFAULT_LABOR_RULE, ...stored.laborRuleCustom }
      : { ...DEFAULT_LABOR_RULE },
    laborHomeMode: resolveLaborHomeMode(stored.laborHomeMode),
    laborHomeFromWeek: clampLaborHomeWeek(stored.laborHomeFromWeek),
    ai: {
      ...base.ai,
      ...stored.ai,
      provider: normalizeProvider(stored.ai?.provider),
      contextPrefs: mergeContextFlags(stored.ai?.contextPrefs),
    },
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function getAskHistory(): AskHistoryItem[] {
  return readJson<AskHistoryItem[]>(STORAGE_KEYS.askHistory, []);
}

export function saveAskHistory(items: AskHistoryItem[]): void {
  writeJson(STORAGE_KEYS.askHistory, items.slice(0, 30));
}

export function getBabies(): BabyProfile[] {
  const raw = readJson<BabyProfile[]>(STORAGE_KEYS.babies, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => b && typeof b.id === 'string' && typeof b.name === 'string');
}

export function saveBabies(babies: BabyProfile[]): void {
  writeJson(STORAGE_KEYS.babies, babies);
}

export function getLaborSessions(): LaborSession[] {
  const raw = readJson<LaborSession[]>(STORAGE_KEYS.laborSessions, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s) => s && typeof s.id === 'string' && Array.isArray(s.contractions)
  );
}

export function saveLaborSessions(sessions: LaborSession[]): void {
  writeJson(STORAGE_KEYS.laborSessions, sessions);
}

/** List every babywise_v1_* key currently in localStorage. */
export function listBabywiseKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  return keys.sort();
}

/**
 * Clean local data. Selective categories or full wipe of all babywise keys.
 * Returns the list of keys removed.
 */
export function clearLocalData(category: DataCategory = 'all'): string[] {
  const removed: string[] = [];

  const removeKey = (key: string) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  };

  switch (category) {
    case 'profile':
      removeKey(STORAGE_KEYS.profile);
      break;
    case 'events':
      removeKey(STORAGE_KEYS.events);
      break;
    case 'settings':
      removeKey(STORAGE_KEYS.settings);
      break;
    case 'askHistory':
      removeKey(STORAGE_KEYS.askHistory);
      break;
    case 'babies':
      removeKey(STORAGE_KEYS.babies);
      break;
    case 'labor':
      removeKey(STORAGE_KEYS.laborSessions);
      break;
    case 'all':
    default: {
      // Full clean: known keys + any stray babywise_v1_* keys
      for (const key of listBabywiseKeys()) {
        localStorage.removeItem(key);
        removed.push(key);
      }
      break;
    }
  }

  return removed;
}

/** First-visit medical + privacy acknowledgment (local only). */
export function hasDisclaimerAck(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEYS.disclaimerAck));
  } catch {
    return false;
  }
}

export function saveDisclaimerAck(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.disclaimerAck, new Date().toISOString());
  } catch (e) {
    console.warn('BabyWise disclaimer ack failed:', e);
  }
}

export function summarizeLocalData(): {
  hasProfile: boolean;
  eventCount: number;
  askCount: number;
  babyCount: number;
  laborCount: number;
  hasCustomSettings: boolean;
  keyCount: number;
} {
  return {
    hasProfile: getProfile() !== null,
    eventCount: getEvents().length,
    askCount: getAskHistory().length,
    babyCount: getBabies().length,
    laborCount: getLaborSessions().length,
    hasCustomSettings: localStorage.getItem(STORAGE_KEYS.settings) !== null,
    keyCount: listBabywiseKeys().length,
  };
}

export { STORAGE_KEYS, STORAGE_PREFIX };
