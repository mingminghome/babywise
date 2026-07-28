import type { GestationalAge, PregnancyProfile } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Standard pregnancy length from LMP: 280 days (40 weeks). */
export const PREGNANCY_DAYS = 280;

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

export function lmpFromDueDate(dueDate: string): string {
  return addDays(dueDate, -PREGNANCY_DAYS);
}

export function normalizeProfile(profile: PregnancyProfile): PregnancyProfile {
  if (profile.method === 'lmp' && profile.lmpDate) {
    return {
      ...profile,
      dueDate: dueDateFromLmp(profile.lmpDate),
    };
  }
  if (profile.method === 'due_date' && profile.dueDate) {
    return {
      ...profile,
      lmpDate: lmpFromDueDate(profile.dueDate),
    };
  }
  return profile;
}

export function getTrimester(weeks: number): 1 | 2 | 3 | null {
  if (weeks < 0) return null;
  if (weeks < 13) return 1;
  if (weeks < 27) return 2;
  return 3;
}

/**
 * Gestational age on a given calendar day (default: today).
 *
 * Internal math (standard obstetric):
 * - Day 0 from LMP = week 0, day-within-week 0
 * - After 70 days = week 10, day-within-week 0  → clinical “10+0”
 * - `days` is always 0–6 (completed days into the current week)
 *
 * Display uses Day 1–7 via {@link formatWeekDay} so users never see “Day 0”.
 */
export function getGestationalAge(
  profile: PregnancyProfile | null,
  onDate: Date = new Date()
): GestationalAge | null {
  if (!profile) return null;
  const normalized = normalizeProfile(profile);
  if (!normalized.lmpDate || !normalized.dueDate) return null;

  const lmp = parseDateOnly(normalized.lmpDate);
  const due = parseDateOnly(normalized.dueDate);
  const totalDays = daysBetween(lmp, onDate);
  const weeks = Math.floor(totalDays / 7);
  const days = ((totalDays % 7) + 7) % 7;
  const daysUntilDue = daysBetween(onDate, due);

  return {
    totalDays,
    weeks: totalDays >= 0 ? weeks : weeks, // can be negative pre-LMP
    days: totalDays >= 0 ? days : days,
    trimester: totalDays >= 0 ? getTrimester(weeks) : null,
    dueDate: normalized.dueDate,
    lmpDate: normalized.lmpDate,
    daysUntilDue,
    isValid: true,
  };
}

/** Baby week number for a calendar date (1-based display often uses completed weeks). */
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

/**
 * Human-facing week/day label.
 * @param days Internal day-within-week 0–6; shown as Day 1–7.
 */
export function formatWeekDay(weeks: number, days: number, locale: string): string {
  const dayOfWeek = Math.min(7, Math.max(1, days + 1));
  if (locale.startsWith('zh')) {
    return `第 ${weeks} 週 · 第 ${dayOfWeek} 天`;
  }
  return `Week ${weeks} · Day ${dayOfWeek}`;
}
