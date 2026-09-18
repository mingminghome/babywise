import { addDays, todayIso } from '../pregnancy/engine';
import { latestIndicatorValue } from './mascot';
import { eventDayIso, eventsForBaby, lastOfType } from './logs';
import { getBabyAge } from './age';
import type { BabyProfile, CalendarEvent, FeedMethod } from '../types';

export type SummaryPeriod = 'day' | 'week' | 'month';

export function periodRange(
  period: SummaryPeriod,
  today = todayIso()
): { from: string; to: string } {
  if (period === 'day') return { from: today, to: today };
  if (period === 'week') return { from: addDays(today, -6), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export type FeedPeriodSummary = {
  feeds: number;
  milkMl: number;
  breastMinutes: number;
  byMethod: Record<FeedMethod, number>;
  pumpMl: number;
  pumpCount: number;
  wetDiapers: number;
  dirtyDiapers: number;
  spitups: number;
  sleepMinutes: number;
};

function inRange(day: string, from: string, to: string): boolean {
  return day >= from && day <= to;
}

export function feedPeriodSummary(
  events: CalendarEvent[],
  babyId: string,
  period: SummaryPeriod,
  today = todayIso(),
  now = Date.now()
): FeedPeriodSummary {
  const { from, to } = periodRange(period, today);
  const out: FeedPeriodSummary = {
    feeds: 0,
    milkMl: 0,
    breastMinutes: 0,
    byMethod: { breast: 0, bottle: 0, formula: 0 },
    pumpMl: 0,
    pumpCount: 0,
    wetDiapers: 0,
    dirtyDiapers: 0,
    spitups: 0,
    sleepMinutes: 0,
  };

  for (const e of eventsForBaby(events, babyId)) {
    const day = eventDayIso(e);
    if (!inRange(day, from, to)) continue;
    if (e.type === 'feed') {
      out.feeds += 1;
      const method = e.feed?.method ?? 'breast';
      out.byMethod[method] += 1;
      out.milkMl += e.feed?.amountMl ?? 0;
      if (method === 'breast') out.breastMinutes += e.feed?.durationMinutes ?? 0;
    } else if (e.type === 'pump') {
      out.pumpCount += 1;
      out.pumpMl += e.pump?.amountMl ?? 0;
    } else if (e.type === 'diaper' && e.diaper) {
      if (e.diaper.kind === 'wet' || e.diaper.kind === 'mixed') out.wetDiapers += 1;
      if (e.diaper.kind === 'dirty' || e.diaper.kind === 'mixed') {
        out.dirtyDiapers += 1;
      }
    } else if (e.type === 'spitup') {
      out.spitups += 1;
    } else if (e.type === 'sleep') {
      const start = Date.parse(e.takenAt ?? e.createdAt);
      const end = e.sleep?.endedAt ? Date.parse(e.sleep.endedAt) : now;
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        out.sleepMinutes += Math.round((end - start) / 60_000);
      }
    }
  }
  return out;
}

export type FeedingSnapshot = {
  hoursSinceFeed: number | null;
  lastFeedMethod?: FeedMethod;
  latestWeightKg?: number;
  birthWeightKg?: number;
  weightDeltaKg?: number;
  ageDays: number | null;
};

export function feedingSnapshot(
  baby: BabyProfile,
  events: CalendarEvent[],
  now = Date.now()
): FeedingSnapshot {
  const last = lastOfType(events, baby.id, 'feed');
  let hoursSinceFeed: number | null = null;
  if (last) {
    const t = Date.parse(last.takenAt ?? last.createdAt);
    if (Number.isFinite(t) && now >= t) hoursSinceFeed = (now - t) / 3_600_000;
  }
  const latestWeightKg = latestIndicatorValue(events, baby.id, 'weight');
  const birthWeightKg = baby.birthWeightKg;
  const weightDeltaKg =
    latestWeightKg != null && birthWeightKg != null
      ? latestWeightKg - birthWeightKg
      : undefined;
  return {
    hoursSinceFeed,
    lastFeedMethod: last?.feed?.method,
    latestWeightKg,
    birthWeightKg,
    weightDeltaKg,
    ageDays: getBabyAge(baby.birthDate)?.totalDays ?? null,
  };
}

/** Cautious, typical-range hints — not medical advice. */
export type FeedingHintId = 'longGap' | 'fewWets' | 'weightDown' | null;

export function feedingHintId(
  snap: FeedingSnapshot,
  wetToday: number
): FeedingHintId {
  const age = snap.ageDays ?? 0;
  if (age < 0) return null;
  if (snap.hoursSinceFeed != null && age < 90 && snap.hoursSinceFeed >= 3.5) {
    return 'longGap';
  }
  if (age >= 5 && age < 90 && wetToday < 4) return 'fewWets';
  if (
    snap.weightDeltaKg != null &&
    age >= 14 &&
    age < 21 &&
    snap.weightDeltaKg < 0
  ) {
    return 'weightDown';
  }
  return null;
}
