import { eventsForDate } from '../calendar/resolve';
import { indicatorSeries } from '../indicators/series';
import { formatWeekDay, getGestationalAge } from '../pregnancy/engine';
import { todayIso } from '../pregnancy/engine';
import type {
  CalendarEvent,
  Locale,
  PregnancyProfile,
} from '../types';

/** What the user can attach into the Ask prompt. */
export type AskContextKey =
  | 'week'
  | 'dueDate'
  | 'medicines'
  | 'takenToday'
  | 'weight'
  | 'readings'
  | 'appointments';

export type AskContextFlags = Record<AskContextKey, boolean>;

/** Predefined Ask include toggles — all on by default. */
export const DEFAULT_ASK_CONTEXT: AskContextFlags = {
  week: true,
  dueDate: true,
  medicines: true,
  takenToday: true,
  weight: true,
  readings: true,
  appointments: true,
};

export const ASK_CONTEXT_KEYS: AskContextKey[] = [
  'week',
  'dueDate',
  'medicines',
  'takenToday',
  'weight',
  'readings',
  'appointments',
];

export type AskContextBundle = {
  week?: string;
  dueDate?: string;
  medicines?: string[];
  takenToday?: string[];
  weight?: string;
  readings?: string[];
  appointments?: string[];
};

/** Pull live data from profile + calendar for prompt inclusion. */
export function collectAskContext(
  profile: PregnancyProfile | null,
  events: CalendarEvent[],
  locale: Locale
): AskContextBundle {
  const ga = getGestationalAge(profile);
  const today = todayIso();
  const isZh = locale === 'zh-Hant';
  const bundle: AskContextBundle = {};

  if (ga && ga.totalDays >= 0) {
    bundle.week = formatWeekDay(ga.weeks, ga.days, locale);
  }
  if (ga?.dueDate || profile?.dueDate) {
    bundle.dueDate = ga?.dueDate ?? profile?.dueDate;
  }

  // Ongoing medicine plans (type medicine, not finished)
  const plans = events.filter((e) => e.type === 'medicine');
  const activePlans = plans.filter((e) => {
    // if has toBabyWeek and past that week, skip
    if (ga && e.toBabyWeek != null && ga.weeks > e.toBabyWeek) return false;
    if (e.endAt && e.endAt.slice(0, 10) < today) return false;
    return true;
  });
  const medNames = [
    ...new Set(
      activePlans.map((e) => {
        const base = e.title.replace(/\s*\([^)]*\)\s*$/, '').trim();
        return e.doseLabel ? `${base} (${e.doseLabel})` : base;
      })
    ),
  ];
  if (medNames.length) bundle.medicines = medNames;

  // Taken today: medicine_log today + completions taken/done on medicine today
  const todayItems = eventsForDate(events, today, profile);
  const taken: string[] = [];
  for (const e of todayItems) {
    if (e.type === 'medicine_log') {
      taken.push(e.title);
      continue;
    }
    if (
      (e.type === 'medicine' || e.type === 'reminder') &&
      e.completions?.[today] === 'taken'
    ) {
      taken.push(e.title);
    }
  }
  if (taken.length) bundle.takenToday = [...new Set(taken)];

  const weights = indicatorSeries(events, 'weight');
  if (weights.length) {
    const last = weights[weights.length - 1];
    bundle.weight = isZh
      ? `${last.value} kg（${last.date}）`
      : `${last.value} kg (${last.date})`;
  }

  const readingKinds = [
    'blood_pressure',
    'heart_rate',
    'blood_sugar',
    'temperature',
    'calories',
    'fundal_height',
    'kick_count',
  ] as const;
  const readingLines: string[] = [];
  for (const kind of readingKinds) {
    const series = indicatorSeries(events, kind);
    if (!series.length) continue;
    const last = series[series.length - 1];
    if (kind === 'blood_pressure' && last.valueSecondary != null) {
      readingLines.push(
        `${kind}: ${last.value}/${last.valueSecondary} (${last.date})`
      );
    } else {
      readingLines.push(`${kind}: ${last.value} (${last.date})`);
    }
  }
  if (readingLines.length) bundle.readings = readingLines;

  const appts = events
    .filter((e) => e.type === 'appointment')
    .filter((e) => {
      const d = e.startAt?.slice(0, 10);
      return !d || d >= today;
    })
    .slice(0, 8)
    .map((e) => {
      const d = e.startAt?.slice(0, 10) ?? '';
      return d ? `${e.title} (${d})` : e.title;
    });
  if (appts.length) bundle.appointments = appts;

  return bundle;
}

export function mergeContextFlags(
  stored?: Partial<AskContextFlags> | null
): AskContextFlags {
  return { ...DEFAULT_ASK_CONTEXT, ...stored };
}
