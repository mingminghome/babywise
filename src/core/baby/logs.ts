import { todayIso } from '../pregnancy/engine';
import type {
  AppSettings,
  BabyProfile,
  CalendarEvent,
  DiaperKind,
  EventType,
} from '../types';

export const BABY_LOG_TYPES: EventType[] = [
  'feed',
  'diaper',
  'sleep',
  'pump',
  'tummy',
  'spitup',
];

export const BABY_READING_KINDS = [
  'weight',
  'temperature',
  'length',
  'head_circumference',
] as const;

export function isBabyLogType(type: EventType): boolean {
  return (
    type === 'feed' ||
    type === 'diaper' ||
    type === 'sleep' ||
    type === 'pump' ||
    type === 'tummy' ||
    type === 'spitup'
  );
}

export function isBabyTabVisible(
  settings: Pick<AppSettings, 'homeMode' | 'hidePregnancy' | 'babyCareEnabled'>,
  babies: BabyProfile[]
): boolean {
  const homeMode =
    settings.homeMode ?? (settings.hidePregnancy ? 'baby' : 'pregnancy');
  if (homeMode === 'baby') return false;
  return babies.length > 0;
}

export function eventsForBaby(
  events: CalendarEvent[],
  babyId: string
): CalendarEvent[] {
  return events.filter((e) => e.babyId === babyId);
}

export function eventsForMother(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => !e.babyId);
}

export function eventDayIso(e: CalendarEvent): string {
  return (e.startAt ?? e.takenAt ?? e.createdAt).slice(0, 10);
}

export function eventsOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso: string
): CalendarEvent[] {
  return eventsForBaby(events, babyId).filter((e) => eventDayIso(e) === dayIso);
}

export function lastOfType(
  events: CalendarEvent[],
  babyId: string,
  type: EventType
): CalendarEvent | null {
  const list = eventsForBaby(events, babyId)
    .filter((e) => e.type === type)
    .toSorted((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
  return list[0] ?? null;
}

export function ongoingSleep(
  events: CalendarEvent[],
  babyId: string
): CalendarEvent | null {
  const list = eventsForBaby(events, babyId)
    .filter((e) => e.type === 'sleep' && e.sleep?.ongoing && !e.sleep.endedAt)
    .toSorted((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
  return list[0] ?? null;
}

export function sleepDurationMs(
  e: CalendarEvent,
  now = Date.now()
): number | null {
  if (e.type !== 'sleep') return null;
  const start = Date.parse(e.takenAt ?? e.createdAt);
  if (!Number.isFinite(start)) return null;
  const endRaw = e.sleep?.endedAt;
  const end = endRaw ? Date.parse(endRaw) : now;
  if (!Number.isFinite(end) || end < start) return null;
  return end - start;
}

export function ongoingTummy(
  events: CalendarEvent[],
  babyId: string
): CalendarEvent | null {
  const list = eventsForBaby(events, babyId)
    .filter((e) => e.type === 'tummy' && e.tummy?.ongoing && !e.tummy.endedAt)
    .toSorted((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
  return list[0] ?? null;
}

export function tummyDurationMs(
  e: CalendarEvent,
  now = Date.now()
): number | null {
  if (e.type !== 'tummy') return null;
  const start = Date.parse(e.takenAt ?? e.createdAt);
  if (!Number.isFinite(start)) return null;
  const endRaw = e.tummy?.endedAt;
  const end = endRaw ? Date.parse(endRaw) : now;
  if (!Number.isFinite(end) || end < start) return null;
  return end - start;
}

export function tummyMinutesOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso(),
  now = Date.now()
): number {
  let ms = 0;
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type !== 'tummy') continue;
    ms += tummyDurationMs(e, now) ?? 0;
  }
  return Math.round(ms / 60_000);
}

export function spitupCountOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso()
): number {
  let count = 0;
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type === 'spitup') count += 1;
  }
  return count;
}

export type DiaperDayCounts = Record<DiaperKind, number> & { total: number };

export function diaperCountsOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso()
): DiaperDayCounts {
  const counts: DiaperDayCounts = {
    wet: 0,
    dirty: 0,
    mixed: 0,
    dry: 0,
    total: 0,
  };
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type !== 'diaper' || !e.diaper) continue;
    counts[e.diaper.kind] += 1;
    counts.total += 1;
  }
  return counts;
}

export function feedCountOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso()
): { count: number; amountMl: number } {
  let count = 0;
  let amountMl = 0;
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type !== 'feed') continue;
    count += 1;
    amountMl += e.feed?.amountMl ?? 0;
  }
  return { count, amountMl };
}

export function pumpCountOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso()
): { count: number; amountMl: number } {
  let count = 0;
  let amountMl = 0;
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type !== 'pump') continue;
    count += 1;
    amountMl += e.pump?.amountMl ?? 0;
  }
  return { count, amountMl };
}

export function sleepMinutesOnDay(
  events: CalendarEvent[],
  babyId: string,
  dayIso = todayIso(),
  now = Date.now()
): number {
  let ms = 0;
  for (const e of eventsOnDay(events, babyId, dayIso)) {
    if (e.type !== 'sleep') continue;
    ms += sleepDurationMs(e, now) ?? 0;
  }
  return Math.round(ms / 60_000);
}

export function sortLogsNewestFirst(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].toSorted((a, b) =>
    (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
  );
}

export function activeBaby(
  babies: BabyProfile[],
  activeBabyId?: string
): BabyProfile | null {
  if (!babies.length) return null;
  return babies.find((b) => b.id === activeBabyId) ?? babies[0] ?? null;
}
