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
  'length',
  'head_circumference',
];

function shouldSumPerDay(kind: IndicatorKind): boolean {
  return SUM_PER_DAY_KINDS.includes(kind);
}

/**
 * Collect dated indicator readings for a kind, sorted ascending by date.
 * - calories / kick_count: same-day entries are **summed** into one point
 * - other kinds: same-day entries use the **mean** (weight, temp, length, …)
 */
export function indicatorSeries(
  events: CalendarEvent[],
  kind: IndicatorKind
): SeriesPoint[] {
  type Acc = {
    date: string;
    sum: number;
    sum2: number;
    has2: boolean;
    eventId: string;
    count: number;
  };
  const byDate = new Map<string, Acc>();
  const sumKind = shouldSumPerDay(kind);

  const ordered = [...events].toSorted((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
  );

  for (const e of ordered) {
    if (e.type !== 'indicator' || !e.indicator || e.indicator.kind !== kind) {
      continue;
    }
    const date = (e.startAt ?? e.createdAt).slice(0, 10);
    if (!date) continue;
    const v2 = e.indicator.valueSecondary;
    const prev = byDate.get(date);
    if (!prev) {
      byDate.set(date, {
        date,
        sum: e.indicator.value,
        sum2: v2 ?? 0,
        has2: v2 != null,
        eventId: e.id,
        count: 1,
      });
      continue;
    }
    byDate.set(date, {
      date,
      sum: prev.sum + e.indicator.value,
      sum2: prev.sum2 + (v2 ?? 0),
      has2: prev.has2 || v2 != null,
      eventId: e.id,
      count: prev.count + 1,
    });
  }

  return [...byDate.values()]
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      date: a.date,
      value: sumKind ? a.sum : a.sum / a.count,
      valueSecondary: a.has2
        ? sumKind
          ? a.sum2
          : a.sum2 / a.count
        : undefined,
      eventId: a.eventId,
      sampleCount: a.count,
    }));
}

export function seriesMean(points: SeriesPoint[]): number | null {
  if (!points.length) return null;
  return points.reduce((s, p) => s + p.value, 0) / points.length;
}

/** Simple moving average (centered-left: last `window` points including current). */
export function movingAverage(
  points: SeriesPoint[],
  window = 3
): number[] {
  const w = Math.max(2, window);
  return points.map((_, i) => {
    const from = Math.max(0, i - w + 1);
    const slice = points.slice(from, i + 1);
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  });
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
