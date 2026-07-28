import type { CalendarEvent, IndicatorKind } from '../types';

export type SeriesPoint = {
  date: string;
  value: number;
  valueSecondary?: number;
  eventId: string;
  /** How many raw logs were merged into this day point (e.g. calories sum). */
  sampleCount?: number;
};

/**
 * Kinds that add up when multiple entries fall on the same calendar day
 * (e.g. two calorie logs → one daily total on charts).
 */
export const SUM_PER_DAY_KINDS: IndicatorKind[] = ['calories', 'kick_count'];

/** Kinds that are useful as home charts (need ≥2 day-points). */
export const CHARTABLE_KINDS: IndicatorKind[] = [
  'weight',
  'calories',
  'blood_pressure',
  'heart_rate',
  'blood_sugar',
  'temperature',
  'fundal_height',
  'kick_count',
];

function shouldSumPerDay(kind: IndicatorKind): boolean {
  return SUM_PER_DAY_KINDS.includes(kind);
}

/**
 * Collect dated indicator readings for a kind, sorted ascending by date.
 * - calories / kick_count: same-day entries are **summed** into one point
 * - other kinds: same-day entries keep the **latest** reading (last by created order)
 */
export function indicatorSeries(
  events: CalendarEvent[],
  kind: IndicatorKind
): SeriesPoint[] {
  type Acc = {
    date: string;
    value: number;
    valueSecondary?: number;
    eventId: string;
    count: number;
  };
  const byDate = new Map<string, Acc>();

  // Stable order: older first so “latest” overwrite works for non-sum kinds
  const ordered = [...events].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  );

  for (const e of ordered) {
    if (e.type !== 'indicator' || !e.indicator || e.indicator.kind !== kind) {
      continue;
    }
    const date = (e.startAt ?? e.createdAt).slice(0, 10);
    if (!date) continue;
    const prev = byDate.get(date);
    if (!prev) {
      byDate.set(date, {
        date,
        value: e.indicator.value,
        valueSecondary: e.indicator.valueSecondary,
        eventId: e.id,
        count: 1,
      });
      continue;
    }
    if (shouldSumPerDay(kind)) {
      byDate.set(date, {
        date,
        value: prev.value + e.indicator.value,
        valueSecondary:
          prev.valueSecondary != null || e.indicator.valueSecondary != null
            ? (prev.valueSecondary ?? 0) + (e.indicator.valueSecondary ?? 0)
            : undefined,
        eventId: e.id,
        count: prev.count + 1,
      });
    } else {
      // Latest reading of the day wins (weight, BP, …)
      byDate.set(date, {
        date,
        value: e.indicator.value,
        valueSecondary: e.indicator.valueSecondary,
        eventId: e.id,
        count: prev.count + 1,
      });
    }
  }

  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      date: a.date,
      value: a.value,
      valueSecondary: a.valueSecondary,
      eventId: a.eventId,
      sampleCount: a.count,
    }));
}

/** Sum of indicator values for a kind on one calendar day (raw logs). */
export function sumIndicatorOnDay(
  events: CalendarEvent[],
  kind: IndicatorKind,
  dayIso: string
): { total: number; count: number; unit?: string } | null {
  let total = 0;
  let count = 0;
  let unit: string | undefined;
  for (const e of events) {
    if (e.type !== 'indicator' || !e.indicator || e.indicator.kind !== kind) {
      continue;
    }
    const date = (e.startAt ?? e.createdAt).slice(0, 10);
    if (date !== dayIso) continue;
    total += e.indicator.value;
    count += 1;
    unit = e.indicator.unit || unit;
  }
  if (count === 0) return null;
  return { total, count, unit };
}

export function chartableSeries(events: CalendarEvent[]): Array<{
  kind: IndicatorKind;
  points: SeriesPoint[];
}> {
  return CHARTABLE_KINDS.map((kind) => ({
    kind,
    points: indicatorSeries(events, kind),
  })).filter((s) => s.points.length >= 2);
}
