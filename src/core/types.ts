export type Locale =
  | 'en'
  | 'zh-Hant'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'sv';

export const LOCALES: readonly Locale[] = [
  'en',
  'zh-Hant',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'nl',
  'pl',
  'sv',
] as const;

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
  | 'indicator'
  | 'feed'
  | 'diaper'
  | 'sleep'
  | 'pump'
  | 'tummy'
  | 'spitup';

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
  | 'length'
  | 'head_circumference'
  | 'custom';

export type BabySex = 'girl' | 'boy' | 'unspecified';

export type BabySkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep';
export type BabyHairColor =
  | 'black'
  | 'dark_brown'
  | 'brown'
  | 'blonde'
  | 'red'
  | 'none';

export const BABY_SKIN_TONES: readonly BabySkinTone[] = [
  'fair',
  'light',
  'medium',
  'tan',
  'deep',
] as const;

export const BABY_HAIR_COLORS: readonly BabyHairColor[] = [
  'black',
  'dark_brown',
  'brown',
  'blonde',
  'red',
  'none',
] as const;

export type FeedMethod = 'breast' | 'bottle' | 'formula';
export type FeedSide = 'left' | 'right' | 'both';
export type DiaperKind = 'wet' | 'dirty' | 'mixed' | 'dry';

export type FeedDetails = {
  method: FeedMethod;
  side?: FeedSide;
  durationMinutes?: number;
  amountMl?: number;
};

export type DiaperDetails = {
  kind: DiaperKind;
};

export type SleepDetails = {
  /** ISO datetime when sleep ended. */
  endedAt?: string;
  ongoing?: boolean;
};

export type PumpDetails = {
  side?: FeedSide;
  durationMinutes?: number;
  amountMl?: number;
};

export type TummyDetails = {
  durationMinutes?: number;
  endedAt?: string;
  ongoing?: boolean;
};

export type SpitupAmount = 'small' | 'medium' | 'large';

export type SpitupDetails = {
  amount?: SpitupAmount;
};

/** Born-baby profile (siblings / twins = multiple records). */
export type BabyProfile = {
  id: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  sex?: BabySex;
  birthWeightKg?: number;
  birthLengthCm?: number;
  skinTone?: BabySkinTone;
  hairColor?: BabyHairColor;
  /** Completed gestational weeks at birth (e.g. 34). Used for corrected age
   * when born before 37 weeks. Term babies can leave this empty.
   */
  gestationalWeeksAtBirth?: number;
  /** Pre-selected feeding method for quick logging (breast, bottle, formula). */
  defaultFeedMethod?: FeedMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

/** 5-1-1 / 4-1-1 / custom “when to go” helper (informational). */
export type LaborRulePreset = '511' | '411' | 'custom';

/** Whether the labor timer card appears on Home. */
export type LaborHomeMode = 'auto' | 'on' | 'off';

export const LABOR_HOME_MODES: readonly LaborHomeMode[] = [
  'auto',
  'on',
  'off',
] as const;

/** Default week to surface the labor timer in Auto mode. */
export const DEFAULT_LABOR_HOME_WEEK = 37;

export type LaborRule = {
  /** Start-to-start gap, minutes. */
  intervalMinutes: number;
  /** How long each wave lasts, minutes. */
  durationMinutes: number;
  /** How long that pattern should hold, minutes. */
  sustainedMinutes: number;
};

export type Contraction = {
  id: string;
  startAt: string;
  endAt?: string;
  intensity?: number;
};

export type LaborSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  contractions: Contraction[];
  notes?: string;
  rulePreset: LaborRulePreset;
  rule: LaborRule;
  notifiedRuleMet?: boolean;
  /** Born baby this labor led to, if the user linked them. */
  babyId?: string;
  createdAt: string;
  updatedAt: string;
};

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
  /** When set, this log belongs to a born baby (not the pregnancy diary). */
  babyId?: string;
  /** Present when type === 'feed'. */
  feed?: FeedDetails;
  /** Present when type === 'diaper'. */
  diaper?: DiaperDetails;
  /** Present when type === 'sleep'. */
  sleep?: SleepDetails;
  /** Present when type === 'pump'. */
  pump?: PumpDetails;
  /** Present when type === 'tummy'. */
  tummy?: TummyDetails;
  /** Present when type === 'spitup'. */
  spitup?: SpitupDetails;
  /**
   * Stable care-plan id (e.g. well-baby visit) so generating reminders
   * is idempotent per baby.
   */
  careKey?: string;
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
  babyAge: boolean;
  babyFeeds: boolean;
  babyDiapers: boolean;
  babySleep: boolean;
  babyWeight: boolean;
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

export type HomeMode = 'pregnancy' | 'baby';

export type AppSettings = {
  locale: Locale;
  theme: ThemeMode;
  /** Preferred pregnancy-week label style (default: weeks_days). */
  gestationalDisplay?: GestationalDisplayStyle;
  /** Home fruit mascot during pregnancy (default on). */
  showMascot?: boolean;
  /** Born-baby head mascot on Baby / postpartum Home (default on). */
  showBabyMascot?: boolean;
  /**
   * Home screen display option:
   * - 'pregnancy': Home shows pregnancy tracker. If babies exist, Baby tab appears in menu.
   * - 'baby': Home shows baby care. Baby tab is omitted from menu to prevent duplication.
   */
  homeMode?: HomeMode;
  /**
   * Show the Baby tab when at least one born-baby profile exists.
   * Tab is hidden if this is off, even if babies are stored.
   */
  babyCareEnabled?: boolean;
  /** Last selected born baby (multi-baby / twins). */
  activeBabyId?: string;
  /**
   * After birth: hide week tracker, gestational calendar view, and
   * pregnancy-only Home chrome. Calendar still holds one diary for both.
   */
  hidePregnancy?: boolean;
  /** Labor “when to go” helper: 5-1-1, 4-1-1, or custom numbers. */
  laborRulePreset?: LaborRulePreset;
  laborRuleCustom?: LaborRule;
  /**
   * Home labor card: auto (from week), always on, or hidden.
   * An in-progress session always shows on Home.
   */
  laborHomeMode?: LaborHomeMode;
  /** Gestational week to start showing the Home labor card in Auto mode. */
  laborHomeFromWeek?: number;
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
  | 'babies'
  | 'labor'
  | 'all';


