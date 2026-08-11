export type Locale = 'en' | 'zh-Hant';

export type ThemeMode = 'warm-light' | 'warm-dark' | 'system';

/**
 * How gestational age is shown in the UI.
 * Math is always completed weeks + day 0–6; only the label style changes.
 * - weeks_days: “Week 13 + 3 days” (common patient-facing form)
 * - clinical: “13+3” (chart / ultrasound notation)
 * - week_day: “Week 13 · Day 4” (1–7 day within the current week)
 */
export type GestationalDisplayStyle = 'weeks_days' | 'clinical' | 'week_day';

export const GESTATIONAL_DISPLAY_STYLES: readonly GestationalDisplayStyle[] = [
  'weeks_days',
  'clinical',
  'week_day',
] as const;

/** Server-backed Ask providers (keys stay on Cloudflare; user only picks which). */
export type AiProviderId = 'gemini' | 'openai' | 'grok' | 'claude';

export const AI_PROVIDERS: readonly AiProviderId[] = [
  'gemini',
  'openai',
  'grok',
  'claude',
] as const;

/** How Ask runs: open the user’s AI website, or call API with a key. */
export type AskMode = 'web' | 'api';

/** Free AI / search sites — they show the answer; we only open + copy prompt. */
export type WebAiTarget =
  | 'google'
  | 'gemini'
  | 'chatgpt'
  | 'perplexity'
  | 'copilot';

/** Mark item finished for a calendar day. */
export type CompletionKind = 'taken' | 'done' | 'present';

export type EventType =
  | 'medicine'
  | 'medicine_log'
  | 'appointment'
  | 'reminder'
  | 'note'
  | 'indicator';

export type Recurrence = 'none' | 'daily' | 'weekly';

export type SafetyTier = 'green' | 'amber' | 'red' | 'unknown';

/** Stored as `lmp` for engine; UI says “last period”, never “LMP”. */
export type ProfileMethod = 'lmp' | 'due_date';

export type IndicatorKind =
  | 'weight'
  | 'calories'
  | 'blood_pressure'
  | 'heart_rate'
  | 'blood_sugar'
  | 'temperature'
  | 'fundal_height'
  | 'kick_count'
  | 'custom';

export type PregnancyProfile = {
  method: ProfileMethod;
  lmpDate?: string;
  dueDate?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

/** Weight, BP, and other pregnancy-related readings on a day. */
export type IndicatorReading = {
  kind: IndicatorKind;
  value: number;
  /** Second number for blood pressure (diastolic). */
  valueSecondary?: number;
  unit: string;
  /** When kind is custom. */
  customLabel?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  fromBabyWeek?: number;
  toBabyWeek?: number;
  recurrence?: Recurrence;
  timesOfDay?: string[];
  notes?: string;
  notifyMinutesBefore?: number[];
  medicineKey?: string;
  /** Present when type === 'indicator'. */
  indicator?: IndicatorReading;
  /**
   * Dose taken log (type === 'medicine_log') or scheduled medicine meta.
   * e.g. amount "1 tablet", "75 mg"
   */
  doseLabel?: string;
  takenAt?: string; // ISO datetime for medicine_log
  /**
   * Per-day completion: key = YYYY-MM-DD, value = taken | done | present.
   * Used for “already taken / finish / present” buttons.
   */
  completions?: Partial<Record<string, CompletionKind>>;
  createdAt: string;
  updatedAt: string;
};

/** Which personal data to attach to Ask prompts (user toggles). */
export type AskContextPrefs = {
  week: boolean;
  dueDate: boolean;
  medicines: boolean;
  takenToday: boolean;
  weight: boolean;
  readings: boolean;
  appointments: boolean;
};

export type AiSettings = {
  /** @deprecated Kept for stored-settings compat. */
  mode?: AskMode;
  /** @deprecated Kept for stored-settings compat. */
  webTarget?: WebAiTarget;
  /** Which server AI to use for Ask (gemini / openai / grok / claude). */
  provider?: AiProviderId;
  /** @deprecated User keys are not used; server secrets only. */
  apiKey?: string;
  /** Optional preferred model id (server may ignore / override). */
  model?: string;
  /** Include these calendar / profile bits in the Ask prompt. */
  contextPrefs?: Partial<AskContextPrefs>;
};

export type AppSettings = {
  locale: Locale;
  theme: ThemeMode;
  /** Preferred pregnancy-week label style (default: weeks_days). */
  gestationalDisplay?: GestationalDisplayStyle;
  ai: AiSettings;
  notificationsEnabled: boolean;
};

/** One viewpoint badge (e.g. Western care vs Chinese medicine). */
export type SafetyPerspective = {
  tier: SafetyTier;
  /** Short note for this viewpoint (optional). */
  summary?: string;
};

/**
 * One line-item when a label/photo/question mentions several ingredients
 * or activities (e.g. food package with a long ingredient list).
 */
export type SafetyItem = {
  name: string;
  /** Primary tier for this item (usually Western). */
  tier: SafetyTier;
  western?: SafetyPerspective;
  tcm?: SafetyPerspective;
  /** Optional short note specific to this item. */
  note?: string;
};

export type SafetyResult = {
  /** Overall / primary tier (usually Western care) — kept for older history items. */
  tier: SafetyTier;
  title: string;
  summary: string;
  caveats?: string[];
  locale: string;
  /** Western / usual maternity care viewpoint. */
  western?: SafetyPerspective;
  /** Traditional Chinese medicine (中醫) viewpoint. */
  tcm?: SafetyPerspective;
  /**
   * Per-ingredient / per-activity breakdown when several were identified
   * (common with label photos). Omitted for single-item answers.
   */
  items?: SafetyItem[];
};

export type AskHistoryItem = {
  id: string;
  query: string;
  hadImage: boolean;
  /** In-app API result, or a stub when opened in an external AI website. */
  result: SafetyResult;
  /** Where the check ran. */
  via?: 'api' | 'web';
  /** Which model family answered (when via === 'api'). */
  provider?: AiProviderId;
  webTarget?: WebAiTarget;
  at: string;
};

export type GestationalAge = {
  totalDays: number;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3 | null;
  dueDate: string;
  lmpDate: string;
  daysUntilDue: number;
  isValid: boolean;
};

export type MedicineEntry = {
  key: string;
  nameEn: string;
  nameZh: string;
  aliases: string[];
  category: 'supplement' | 'medicine' | 'miscarriage_care' | 'other';
};

/** Categories of local data that can be cleared selectively. */
export type DataCategory =
  | 'profile'
  | 'events'
  | 'settings'
  | 'askHistory'
  | 'all';


