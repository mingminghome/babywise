import type { Locale } from '../types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function isIsoDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export type BabyAge = {
  totalDays: number;
  weeks: number;
  days: number;
};

/** Chronological age from birth date (local calendar days). */
export function getBabyAge(
  birthDate: string,
  onDate: Date = new Date()
): BabyAge | null {
  if (!isIsoDate(birthDate)) return null;
  const born = parseDateOnly(birthDate);
  const totalDays = Math.round(
    (startOfLocalDay(onDate).getTime() - born.getTime()) / MS_PER_DAY
  );
  const weeks = Math.floor(totalDays / 7);
  const days = ((totalDays % 7) + 7) % 7;
  return { totalDays, weeks, days };
}

function formatAgeValue(age: BabyAge, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  if (age.totalDays < 0) {
    return zh ? '尚未出生' : 'Not born yet';
  }
  if (age.totalDays === 0) {
    return zh ? '出生當天' : 'Born today';
  }
  if (age.totalDays < 14) {
    return zh ? `${age.totalDays} 日大` : `${age.totalDays} days old`;
  }
  if (age.days === 0) {
    return zh ? `${age.weeks} 週大` : `${age.weeks} weeks old`;
  }
  return zh
    ? `${age.weeks} 週 + ${age.days} 天`
    : `${age.weeks} weeks + ${age.days} days`;
}

export function formatBabyAge(
  birthDate: string,
  locale: Locale,
  onDate: Date = new Date()
): string {
  const age = getBabyAge(birthDate, onDate);
  if (!age) return '';
  return formatAgeValue(age, locale);
}

/** Term pregnancy length used for corrected age. */
export const TERM_WEEKS = 40;
export const PRETERM_BEFORE_WEEKS = 37;

/**
 * Corrected age for babies born before 37 weeks:
 * chronological age minus weeks early (40 − gestational weeks at birth).
 */
export function getCorrectedAge(
  birthDate: string,
  gestationalWeeksAtBirth: number | undefined,
  onDate: Date = new Date()
): BabyAge | null {
  if (
    gestationalWeeksAtBirth == null ||
    !Number.isFinite(gestationalWeeksAtBirth) ||
    gestationalWeeksAtBirth >= PRETERM_BEFORE_WEEKS
  ) {
    return null;
  }
  const chrono = getBabyAge(birthDate, onDate);
  if (!chrono) return null;
  const weeksEarly = TERM_WEEKS - Math.round(gestationalWeeksAtBirth);
  const totalDays = chrono.totalDays - weeksEarly * 7;
  const weeks = Math.floor(totalDays / 7);
  const days = ((totalDays % 7) + 7) % 7;
  return { totalDays, weeks, days };
}

export function formatCorrectedAge(
  birthDate: string,
  gestationalWeeksAtBirth: number | undefined,
  locale: Locale,
  onDate: Date = new Date()
): string | null {
  const age = getCorrectedAge(birthDate, gestationalWeeksAtBirth, onDate);
  if (!age) return null;
  const zh = locale === 'zh-Hant';
  if (age.totalDays < 0) {
    return zh
      ? `矯正年齡：距預產期等值還有 ${Math.abs(age.totalDays)} 天`
      : `Corrected: ${Math.abs(age.totalDays)} days before term-equivalent`;
  }
  return zh
    ? `矯正年齡 ${formatAgeValue(age, locale)}`
    : `Corrected ${formatAgeValue(age, locale)}`;
}
