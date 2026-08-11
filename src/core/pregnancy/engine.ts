import type {
  GestationalAge,
  GestationalDisplayStyle,
  PregnancyProfile,
  ProfileMethod,
} from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Standard pregnancy length from LMP: 280 days (40 weeks). */
export const PREGNANCY_DAYS = 280;

/** Soft bounds for sensible date entry (not hard medical limits). */
export const LMP_MAX_DAYS_AGO = 320; // ~45+ weeks
export const LMP_MAX_DAYS_AHEAD = 14;
export const DUE_MAX_DAYS_AHEAD = 300; // ~43 weeks
export const DUE_MAX_DAYS_PAST = 42; // ~6 weeks postpartum

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function parseDateOnly(iso: string): Date {
  // Interpret as local calendar date (YYYY-MM-DD)
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/** Whole calendar days from date `a` to date `b` (b − a). Can be negative. */
function daysBetween(a: Date, b: Date): number {
  const sa = startOfLocalDay(a).getTime();
  const sb = startOfLocalDay(b).getTime();
  return Math.round((sb - sa) / MS_PER_DAY);
}

export function addDays(isoDate: string, days: number): string {
  const d = parseDateOnly(isoDate);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

/** Naegele: due date = LMP + 280 days. */
export function dueDateFromLmp(lmpDate: string): string {
  return addDays(lmpDate, PREGNANCY_DAYS);
}

/** Inverse of Naegele: LMP = due date − 280 days. */
export function lmpFromDueDate(dueDate: string): string {
  return addDays(dueDate, -PREGNANCY_DAYS);
}

/**
 * Ensure LMP and due date are a consistent 280-day pair.
 * - method `lmp`: trust lmpDate, derive dueDate
 * - method `due_date`: trust dueDate, derive lmpDate
 *
 * Important: an *earlier* due date means an *earlier* LMP, so gestational
 * age today is *higher* (you are further along). That is intentional.
 */
export function normalizeProfile(profile: PregnancyProfile): PregnancyProfile {
  if (profile.method === 'lmp' && profile.lmpDate) {
    return {
      ...profile,
      lmpDate: profile.lmpDate,
      dueDate: dueDateFromLmp(profile.lmpDate),
    };
  }
  if (profile.method === 'due_date' && profile.dueDate) {
    return {
      ...profile,
      dueDate: profile.dueDate,
      lmpDate: lmpFromDueDate(profile.dueDate),
    };
  }
  return profile;
}

/**
 * Build a temporary profile for live setup previews (not persisted).
 */
export function profileFromInput(
  method: ProfileMethod,
  dateValue: string,
  base?: Pick<PregnancyProfile, 'timezone' | 'createdAt' | 'updatedAt'> | null
): PregnancyProfile | null {
  if (!isIsoDate(dateValue)) return null;
  const now = new Date().toISOString();
  return normalizeProfile({
    method,
    lmpDate: method === 'lmp' ? dateValue : undefined,
    dueDate: method === 'due_date' ? dateValue : undefined,
    timezone: base?.timezone ?? 'UTC',
    createdAt: base?.createdAt ?? now,
    updatedAt: base?.updatedAt ?? now,
  });
}

export function getTrimester(weeks: number): 1 | 2 | 3 | null {
  if (weeks < 0) return null;
  if (weeks < 13) return 1;
  if (weeks < 27) return 2;
  return 3;
}

/**
 * Split total day count into completed weeks + day-within-week (0–6).
 * Works for negative totals (before LMP).
 */
export function splitWeekDay(totalDays: number): { weeks: number; days: number } {
  const weeks = Math.floor(totalDays / 7);
  // Positive modulo so day-within-week is always 0–6, even when totalDays < 0
  const days = ((totalDays % 7) + 7) % 7;
  return { weeks, days };
}

/**
 * Gestational age on a given calendar day (default: today).
 *
 * Standard obstetric dating from LMP (Naegele, 280-day pregnancy):
 * - Day 0 from LMP = week 0, day-within-week 0
 * - After 70 days = week 10, day-within-week 0 → clinical “10+0”
 * - On the due date = week 40, day-within-week 0
 * - `days` is always 0–6 (completed days into the current week)
 *
 * Equivalent due-date form (used as a consistency check):
 *   totalDays = PREGNANCY_DAYS − daysUntilDue
 *
 * So if the due date moves earlier, daysUntilDue falls and totalDays rises
 * (e.g. EDD 13 Feb → 8 Feb adds 5 gestational days; week number may increase).
 *
 * Display via {@link formatWeekDay} uses the same 0–6 day count as clinical “W+D”.
 */
export function getGestationalAge(
  profile: PregnancyProfile | null,
  onDate: Date = new Date()
): GestationalAge | null {
  if (!profile) return null;
  const normalized = normalizeProfile(profile);
  if (!normalized.lmpDate || !normalized.dueDate) return null;
  if (!isIsoDate(normalized.lmpDate) || !isIsoDate(normalized.dueDate)) return null;

  const lmp = parseDateOnly(normalized.lmpDate);
  const due = parseDateOnly(normalized.dueDate);
  const daysUntilDue = daysBetween(onDate, due);

  // Path A: days since LMP
  const totalDaysFromLmp = daysBetween(lmp, onDate);
  // Path B: 280 − days remaining until due (must match when pair is 280 days apart)
  const totalDaysFromDue = PREGNANCY_DAYS - daysUntilDue;

  // Prefer LMP path; if the stored pair is consistent they are identical.
  // If they ever diverge (corrupt storage), trust the field that matches method.
  const totalDays =
    normalized.method === 'due_date' ? totalDaysFromDue : totalDaysFromLmp;

  const { weeks, days } = splitWeekDay(totalDays);

  return {
    totalDays,
    weeks,
    days,
    trimester: totalDays >= 0 ? getTrimester(weeks) : null,
    dueDate: normalized.dueDate,
    lmpDate: normalized.lmpDate,
    daysUntilDue,
    // Valid when both dating paths agree (pair is exactly 280 days).
    isValid: totalDaysFromLmp === totalDaysFromDue,
  };
}

/** Live preview while the user is still choosing a date on the setup form. */
export function previewGestationalAge(
  method: ProfileMethod,
  dateValue: string,
  onDate: Date = new Date()
): GestationalAge | null {
  return getGestationalAge(profileFromInput(method, dateValue), onDate);
}

/** 0–100 progress toward the due date (clamped). */
export function progressPercent(ga: GestationalAge | null): number {
  if (!ga || ga.totalDays < 0) return 0;
  return Math.min(100, Math.max(0, (ga.totalDays / PREGNANCY_DAYS) * 100));
}

export type DateInputHint = 'ok' | 'empty' | 'invalid' | 'lmp_future' | 'lmp_old' | 'due_past' | 'due_far';

/** Soft validation for the setup date field (does not block save). */
export function dateInputHint(
  method: ProfileMethod,
  dateValue: string,
  onDate: Date = new Date()
): DateInputHint {
  if (!dateValue) return 'empty';
  if (!isIsoDate(dateValue)) return 'invalid';
  const today = startOfLocalDay(onDate);
  const picked = parseDateOnly(dateValue);
  const delta = daysBetween(today, picked); // picked − today

  if (method === 'lmp') {
    if (delta > LMP_MAX_DAYS_AHEAD) return 'lmp_future';
    if (delta < -LMP_MAX_DAYS_AGO) return 'lmp_old';
    return 'ok';
  }

  // due_date
  if (delta < -DUE_MAX_DAYS_PAST) return 'due_past';
  if (delta > DUE_MAX_DAYS_AHEAD) return 'due_far';
  return 'ok';
}

/** Baby week number for a calendar date (completed gestational weeks). */
export function babyWeekOnDate(
  profile: PregnancyProfile | null,
  onDate: Date = new Date()
): number | null {
  const ga = getGestationalAge(profile, onDate);
  if (!ga || ga.totalDays < 0) return null;
  return ga.weeks;
}

/** First calendar date of a gestational week (week 0 = LMP week). */
export function dateOfBabyWeekStart(
  profile: PregnancyProfile | null,
  week: number
): string | null {
  if (!profile) return null;
  const n = normalizeProfile(profile);
  if (!n.lmpDate) return null;
  return addDays(n.lmpDate, week * 7);
}

/** Last calendar date still inside gestational week (week N day 6). */
export function dateOfBabyWeekEnd(
  profile: PregnancyProfile | null,
  week: number
): string | null {
  if (!profile) return null;
  const n = normalizeProfile(profile);
  if (!n.lmpDate) return null;
  return addDays(n.lmpDate, week * 7 + 6);
}

export function todayIso(): string {
  return toDateOnly(new Date());
}

/** Locale-aware calendar date for UI (ISO in, e.g. “13 Feb 2027” out). */
export function formatIsoDate(iso: string, locale: string): string {
  if (!isIsoDate(iso)) return iso;
  const d = parseDateOnly(iso);
  try {
    return d.toLocaleDateString(locale.startsWith('zh') ? 'zh-Hant' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Clamp internal day-within-week to 0–6. */
function dayInWeek(days: number): number {
  return ((days % 7) + 7) % 7;
}

/**
 * Human-facing gestational age label.
 *
 * Internal math is always completed weeks + days 0–6 (clinical “W+D”).
 * {@link GestationalDisplayStyle} only changes wording:
 * - weeks_days → “Week 13 + 3 days” (matches clinical numbers; common for parents)
 * - clinical → “13+3” (charts / ultrasound reports)
 * - week_day → “Week 13 · Day 4” (1–7 day within the week; some consumer apps)
 */
export function formatWeekDay(
  weeks: number,
  days: number,
  locale: string,
  style: GestationalDisplayStyle = 'weeks_days'
): string {
  const d = dayInWeek(days);
  const zh = locale.startsWith('zh');

  if (style === 'clinical') {
    return formatClinicalAge(weeks, d);
  }

  if (style === 'week_day') {
    // Day 1–7 of the current gestational week (day 0 → Day 1, day 6 → Day 7)
    const dayNum = d + 1;
    if (zh) return `第 ${weeks} 週 · 第 ${dayNum} 天`;
    return `Week ${weeks} · Day ${dayNum}`;
  }

  // weeks_days (default)
  if (zh) {
    return d === 0 ? `第 ${weeks} 週` : `第 ${weeks} 週 + ${d} 天`;
  }
  return d === 0 ? `Week ${weeks}` : `Week ${weeks} + ${d} days`;
}

/** Clinical shorthand “13+3” (completed weeks + days 0–6). */
export function formatClinicalAge(weeks: number, days: number): string {
  return `${weeks}+${dayInWeek(days)}`;
}

/** Whether to show the clinical “W+D” chip under the main label. */
export function showClinicalSecondary(style: GestationalDisplayStyle): boolean {
  // Avoid duplicating “13+3” under itself.
  return style !== 'clinical';
}

