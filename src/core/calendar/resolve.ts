import {
  babyWeekOnDate,
  dateOfBabyWeekEnd,
  dateOfBabyWeekStart,
  todayIso,
} from '../pregnancy/engine';
import type { CalendarEvent, PregnancyProfile } from '../types';

function parseLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type ResolvedWindow = {
  startDate: string | null;
  endDate: string | null;
};

/** Resolve absolute + baby-week constraints into a calendar window. */
export function resolveEventWindow(
  event: CalendarEvent,
  profile: PregnancyProfile | null
): ResolvedWindow {
  let startDate = event.startAt?.slice(0, 10) ?? null;
  let endDate = event.endAt?.slice(0, 10) ?? null;

  if (event.fromBabyWeek != null && profile) {
    const wStart = dateOfBabyWeekStart(profile, event.fromBabyWeek);
    if (wStart) {
      startDate = startDate
        ? toIso(new Date(Math.max(parseLocal(startDate).getTime(), parseLocal(wStart).getTime())))
        : wStart;
    }
  }
  if (event.toBabyWeek != null && profile) {
    const wEnd = dateOfBabyWeekEnd(profile, event.toBabyWeek);
    if (wEnd) {
      endDate = endDate
        ? toIso(new Date(Math.min(parseLocal(endDate).getTime(), parseLocal(wEnd).getTime())))
        : wEnd;
    }
  }

  // Open-ended with only toBabyWeek: start from today or fromWeek
  if (!startDate && endDate) {
    startDate = todayIso();
  }

  return { startDate, endDate };
}

export function isEventActiveOnDate(
  event: CalendarEvent,
  dateIso: string,
  profile: PregnancyProfile | null
): boolean {
  const { startDate, endDate } = resolveEventWindow(event, profile);
  if (startDate && dateIso < startDate) return false;
  if (endDate && dateIso > endDate) return false;

  // If only baby-week bounds and no dates, check week
  if (!startDate && !endDate) {
    if (event.fromBabyWeek == null && event.toBabyWeek == null) return false;
    const week = babyWeekOnDate(profile, parseLocal(dateIso));
    if (week == null) return false;
    if (event.fromBabyWeek != null && week < event.fromBabyWeek) return false;
    if (event.toBabyWeek != null && week > event.toBabyWeek) return false;
  }

  if (event.recurrence === 'weekly' && startDate) {
    const start = parseLocal(startDate);
    const cur = parseLocal(dateIso);
    if (start.getDay() !== cur.getDay()) return false;
  }

  if (event.recurrence === 'none' && startDate && !endDate) {
    return dateIso === startDate;
  }

  return true;
}

export function eventsForDate(
  events: CalendarEvent[],
  dateIso: string,
  profile: PregnancyProfile | null
): CalendarEvent[] {
  return events.filter((e) => isEventActiveOnDate(e, dateIso, profile));
}

export function groupByBabyWeek(
  events: CalendarEvent[],
  profile: PregnancyProfile | null
): Map<number, CalendarEvent[]> {
  const map = new Map<number, CalendarEvent[]>();
  for (const e of events) {
    const week =
      e.fromBabyWeek ??
      (e.startAt && profile
        ? babyWeekOnDate(profile, parseLocal(e.startAt.slice(0, 10)))
        : null);
    const key = week ?? -1;
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}
