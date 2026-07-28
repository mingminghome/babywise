import { addDays } from '../pregnancy/engine';

/** Monday-based week start for a given ISO date. */
export function startOfWeekMonday(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  const day = dt.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return toIso(dt);
}

export function startOfMonth(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function addMonths(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1 + delta, Math.min(d ?? 1, 28), 12, 0, 0, 0);
  // clamp to last day of target month
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d ?? 1, last));
  return toIso(dt);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysInMonthGrid(anchorIso: string): string[] {
  const monthStart = startOfMonth(anchorIso);
  const gridStart = startOfWeekMonday(monthStart);
  // 6 weeks × 7 = 42 cells
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function weekDaysFrom(anchorIso: string): string[] {
  const start = startOfWeekMonday(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function formatMonthTitle(isoDate: string, locale: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  try {
    return d.toLocaleDateString(locale.startsWith('zh') ? 'zh-Hant' : 'en', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${y}-${String(m).padStart(2, '0')}`;
  }
}

export const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LABELS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
