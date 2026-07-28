/**
 * Shared calendar event metadata — single source for types, completion, times.
 */
import type { CalendarEvent, CompletionKind, EventType } from '../types';

/** Canonical order for quick-log + type pickers. */
export const EVENT_TYPES: EventType[] = [
  'medicine_log',
  'medicine',
  'indicator',
  'appointment',
  'reminder',
  'note',
];

export type CalendarViewMode = 'today' | 'week' | 'month' | 'babyWeek';

export const CALENDAR_VIEWS: Array<{
  id: CalendarViewMode;
  labelKey: string;
}> = [
  { id: 'today', labelKey: 'calendar.today' },
  { id: 'week', labelKey: 'calendar.week' },
  { id: 'month', labelKey: 'calendar.month' },
  { id: 'babyWeek', labelKey: 'calendar.byBabyWeek' },
];

export function preferredCompleteKind(type: EventType): CompletionKind {
  if (type === 'medicine' || type === 'medicine_log') return 'taken';
  if (type === 'appointment') return 'present';
  return 'done';
}

/** i18n key for action button (Taken / Done / Present). */
export function completeActionKey(kind: CompletionKind): string {
  if (kind === 'taken') return 'calendar.markTaken';
  if (kind === 'present') return 'calendar.markPresent';
  return 'calendar.markDone';
}

/** i18n key for status badge. */
export function statusLabelKey(kind: CompletionKind): string {
  if (kind === 'taken') return 'calendar.statusTaken';
  if (kind === 'present') return 'calendar.statusPresent';
  return 'calendar.statusDone';
}

export function parseTimesInput(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Local clock HH:mm (for stamping readings). */
export function localHm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

/**
 * Prefer timesOfDay, then takenAt, then createdAt as local HH:mm.
 */
export function eventTimeLabel(e: CalendarEvent): string {
  if (e.timesOfDay?.[0]) return e.timesOfDay[0];
  if (e.takenAt && e.takenAt.length >= 16) return e.takenAt.slice(11, 16);
  if (e.createdAt) {
    const d = new Date(e.createdAt);
    if (!Number.isNaN(d.getTime())) return localHm(d);
  }
  return '';
}

export function sortByEventTime(a: CalendarEvent, b: CalendarEvent): number {
  const ta = eventTimeLabel(a) || a.createdAt || '';
  const tb = eventTimeLabel(b) || b.createdAt || '';
  return ta.localeCompare(tb);
}
