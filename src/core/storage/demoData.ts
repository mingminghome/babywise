/**
 * Randomized local sample data for demos / QA.
 * Writes only to this browser’s localStorage.
 */
import { getSettings, saveBabies, saveEvents, saveLaborSessions, saveProfile, saveSettings } from './store';
import { buildCheckupEvent, WELL_BABY_CHECKUPS } from '../baby/checkups';
import {
  diaperTitle,
  feedTitle,
  pumpTitle,
  sleepTitle,
  spitupTitle,
  tummyTitle,
} from '../baby/titles';
import { DEFAULT_LABOR_RULE, LABOR_PRESET_RULES } from '../labor/engine';
import {
  addDays,
  dueDateFromLmp,
  formatWeekDay,
  getGestationalAge,
  todayIso,
} from '../pregnancy/engine';
import type {
  BabyProfile,
  CalendarEvent,
  Contraction,
  DiaperKind,
  FeedMethod,
  FeedSide,
  IndicatorKind,
  LaborSession,
  PregnancyProfile,
  SpitupAmount,
} from '../types';

function uid(seed: string): string {
  return `demo-${seed}-${Math.random().toString(36).slice(2, 9)}`;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function hm(h: number, m?: number): string {
  return `${pad2(h)}:${pad2(m ?? randInt(0, 5) * 10)}`;
}

const MED_NAMES = [
  'Prenatal vitamin',
  'Folic acid',
  'Iron supplement',
  'Calcium + D',
  'Omega-3 DHA',
  'Vitamin B6',
  'Magnesium',
] as const;

const MED_DOSES = ['1 tablet', '1 capsule', '400 mcg', '200 mg', '1 scoop'] as const;

const APPT_TITLES = [
  'Antenatal check-up',
  'Midwife visit',
  'Ultrasound scan',
  'Blood test',
  'Glucose screening',
  'Dentist (pregnancy)',
] as const;

const REMINDERS = [
  'Drink water',
  'Take a short walk',
  'Stretch hips',
  'Prep healthy snack',
  'Rest with feet up',
  'Kegel practice',
] as const;

const NOTES = [
  'Kicks felt stronger after lunch',
  'Slept better last night',
  'Mild heartburn after spicy food',
  'Felt more energetic today',
  'Remembered to stretch',
  'Mood was calm this afternoon',
] as const;

const BABY_NAMES = ['Mei', 'Jun', 'Aria', 'Luca', 'Noor', 'Theo'] as const;

/**
 * Mix of mid-pregnancy (calendar demo) and late pregnancy (labor card on Home).
 */
export function buildDemoProfile(): PregnancyProfile {
  const now = new Date().toISOString();
  const late = Math.random() < 0.55;
  const daysPregnant = late ? randInt(252, 273) : randInt(84, 196); // ~36–39 or 12–28
  const lmpDate = addDays(todayIso(), -daysPregnant);
  const method = Math.random() < 0.65 ? 'lmp' : 'due_date';
  const dueDate = dueDateFromLmp(lmpDate);
  return {
    method,
    lmpDate: method === 'lmp' ? lmpDate : undefined,
    dueDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDemoBabies(): BabyProfile[] {
  const now = new Date().toISOString();
  const twins = Math.random() < 0.28;
  const names = shuffle([...BABY_NAMES]);
  const ageDays = twins ? randInt(10, 40) : randInt(8, 120);
  const birthDate = addDays(todayIso(), -ageDays);
  const birthTime = hm(randInt(1, 23), pick([0, 12, 30, 45]));
  const make = (name: string, i: number): BabyProfile => ({
    id: uid(`baby-${i}`),
    name,
    birthDate,
    birthTime,
    sex: pick(['girl', 'boy', 'unspecified']),
    skinTone: pick(['fair', 'light', 'medium', 'tan', 'deep']),
    hairColor: pick(['black', 'dark_brown', 'brown', 'blonde', 'red', 'none']),
    birthWeightKg: Math.round((2.6 + Math.random() * 1.4) * 100) / 100,
    birthLengthCm: Math.round((46 + Math.random() * 8) * 10) / 10,
    gestationalWeeksAtBirth: Math.random() < 0.25 ? randInt(32, 36) : randInt(37, 40),
    createdAt: now,
    updatedAt: now,
  });
  const first = make(names[0]!, 0);
  if (!twins) return [first];
  return [first, make(names[1]!, 1)];
}

function stamp(
  now: string,
  babyId: string,
  day: string,
  time: string
): Pick<
  CalendarEvent,
  'babyId' | 'startAt' | 'timesOfDay' | 'takenAt' | 'allDay' | 'recurrence' | 'createdAt' | 'updatedAt'
> {
  return {
    babyId,
    startAt: day,
    timesOfDay: [time],
    takenAt: `${day}T${time}:00`,
    allDay: false,
    recurrence: 'none',
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDemoBabyEvents(babies: BabyProfile[]): CalendarEvent[] {
  const now = new Date().toISOString();
  const today = todayIso();
  const events: CalendarEvent[] = [];
  const methods: FeedMethod[] = ['breast', 'bottle', 'formula'];
  const sides: FeedSide[] = ['left', 'right', 'both'];
  const diapers: DiaperKind[] = ['wet', 'dirty', 'mixed'];
  const spit: SpitupAmount[] = ['small', 'medium', 'large'];

  for (const baby of babies) {
    for (const dayOffset of [0, 1, 2]) {
      const day = addDays(today, -dayOffset);
      const feeds = randInt(4, 7);
      for (let i = 0; i < feeds; i++) {
        const method = pick(methods);
        const feed = {
          method,
          side: method === 'breast' ? pick(sides) : undefined,
          durationMinutes: method === 'breast' ? randInt(8, 28) : randInt(5, 18),
          amountMl: method === 'breast' ? undefined : randInt(60, 150),
        };
        const t = hm(randInt(5, 22));
        events.push({
          id: uid(`feed-${baby.id}-${dayOffset}-${i}`),
          title: feedTitle(feed, 'en'),
          type: 'feed',
          feed,
          ...stamp(now, baby.id, day, t),
        });
      }

      const nDiapers = randInt(4, 7);
      for (let i = 0; i < nDiapers; i++) {
        const diaper = { kind: pick(diapers) };
        events.push({
          id: uid(`diaper-${baby.id}-${dayOffset}-${i}`),
          title: diaperTitle(diaper, 'en'),
          type: 'diaper',
          diaper,
          ...stamp(now, baby.id, day, hm(randInt(6, 22))),
        });
      }

      const sleeps = randInt(2, 4);
      for (let i = 0; i < sleeps; i++) {
        const startH = randInt(0, 20);
        const mins = randInt(35, 140);
        const start = `${day}T${hm(startH)}:00`;
        const endMs = Date.parse(start) + mins * 60_000;
        const endedAt = Number.isFinite(endMs)
          ? new Date(endMs).toISOString()
          : undefined;
        const sleep = { endedAt, ongoing: false };
        const ev: CalendarEvent = {
          id: uid(`sleep-${baby.id}-${dayOffset}-${i}`),
          title: '',
          type: 'sleep',
          sleep,
          ...stamp(now, baby.id, day, hm(startH)),
        };
        ev.title = sleepTitle(sleep, 'en', ev);
        events.push(ev);
      }

      if (Math.random() < 0.7) {
        const pump = {
          side: pick(sides),
          durationMinutes: randInt(10, 25),
          amountMl: randInt(40, 160),
        };
        events.push({
          id: uid(`pump-${baby.id}-${dayOffset}`),
          title: pumpTitle(pump, 'en'),
          type: 'pump',
          pump,
          ...stamp(now, baby.id, day, hm(randInt(8, 20))),
        });
      }

      if (Math.random() < 0.65) {
        const tummy = { durationMinutes: randInt(3, 12), ongoing: false };
        events.push({
          id: uid(`tummy-${baby.id}-${dayOffset}`),
          title: tummyTitle(tummy, 'en'),
          type: 'tummy',
          tummy,
          ...stamp(now, baby.id, day, hm(randInt(10, 18))),
        });
      }

      if (Math.random() < 0.45) {
        const spitup = { amount: pick(spit) };
        events.push({
          id: uid(`spit-${baby.id}-${dayOffset}`),
          title: spitupTitle(spitup, 'en'),
          type: 'spitup',
          spitup,
          ...stamp(now, baby.id, day, hm(randInt(8, 20))),
        });
      }
    }

    const birthKg = baby.birthWeightKg ?? 3.2;
    for (let i = 0; i < 3; i++) {
      const day = addDays(today, -i * 4);
      const value = Math.round((birthKg + i * 0.08 + Math.random() * 0.05) * 100) / 100;
      events.push({
        id: uid(`bweight-${baby.id}-${i}`),
        title: `${value} kg`,
        type: 'indicator',
        indicator: { kind: 'weight', value, unit: 'kg' },
        ...stamp(now, baby.id, day, hm(9)),
      });
    }

    const upcoming = WELL_BABY_CHECKUPS.filter((c) => {
      const when = addDays(baby.birthDate, c.offsetDays);
      return when >= addDays(today, -7);
    }).slice(0, 3);
    for (const template of upcoming) {
      const built = buildCheckupEvent(baby, template, 'en');
      events.push({
        ...built,
        id: uid(`check-${baby.id}-${template.key}`),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return events;
}

export function buildDemoLabor(
  babies: BabyProfile[],
  latePregnancy: boolean
): LaborSession[] {
  const now = new Date().toISOString();
  const today = todayIso();
  const rule = LABOR_PRESET_RULES['511'];
  const sessions: LaborSession[] = [];

  const contractionsFor = (startIso: string, count: number, openLast: boolean): Contraction[] => {
    const out: Contraction[] = [];
    let t = Date.parse(startIso);
    if (!Number.isFinite(t)) t = Date.now() - 2 * 60 * 60 * 1000;
    for (let i = 0; i < count; i++) {
      const dur = randInt(40, 75);
      const startAt = new Date(t).toISOString();
      const endAt =
        openLast && i === count - 1
          ? undefined
          : new Date(t + dur * 1000).toISOString();
      out.push({
        id: uid(`cx-${i}`),
        startAt,
        endAt,
        intensity: randInt(2, 5),
      });
      t += randInt(3, 7) * 60 * 1000;
    }
    return out;
  };

  const birth = babies[0]?.birthDate;
  const linkedStart = birth
    ? `${addDays(birth, 0)}T${hm(randInt(1, 6))}:00`
    : `${addDays(today, -randInt(2, 8))}T${hm(18)}:00`;
  const linked: LaborSession = {
    id: uid('labor-linked'),
    startedAt: linkedStart,
    endedAt: new Date(Date.parse(linkedStart) + randInt(4, 10) * 3600_000).toISOString(),
    contractions: contractionsFor(linkedStart, randInt(8, 14), false),
    rulePreset: '511',
    rule,
    babyId: babies[0]?.id,
    notes: 'Sample labor diary — not medical data',
    createdAt: now,
    updatedAt: now,
  };
  sessions.push(linked);

  if (latePregnancy && Math.random() < 0.45) {
    const start = new Date(Date.now() - randInt(20, 50) * 60_000).toISOString();
    sessions.push({
      id: uid('labor-open'),
      startedAt: start,
      contractions: contractionsFor(start, randInt(3, 6), true),
      rulePreset: '511',
      rule: DEFAULT_LABOR_RULE,
      createdAt: now,
      updatedAt: now,
    });
  }

  return sessions;
}

export function buildDemoEvents(_profile: PregnancyProfile): CalendarEvent[] {
  const now = new Date().toISOString();
  const today = todayIso();
  const events: CalendarEvent[] = [];

  // 1–2 medicine plans
  const meds = shuffle([...MED_NAMES]).slice(0, randInt(1, 2));
  meds.forEach((name, i) => {
    const start = addDays(today, -randInt(3, 21));
    const times = shuffle([hm(8), hm(12), hm(20)]).slice(0, randInt(1, 2));
    const yday = addDays(today, -1);
    events.push({
      id: uid(`med-plan-${i}`),
      title: name,
      type: 'medicine',
      startAt: start,
      timesOfDay: times,
      recurrence: 'daily',
      doseLabel: pick(MED_DOSES),
      notifyMinutesBefore: Math.random() < 0.6 ? [0] : undefined,
      completions:
        Math.random() < 0.7
          ? { [yday]: 'taken', ...(Math.random() < 0.4 ? { [today]: 'taken' } : {}) }
          : undefined,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 0–2 medicine logs today / yesterday
  const logCount = randInt(0, 2);
  for (let i = 0; i < logCount; i++) {
    const name = pick(MED_NAMES);
    const dose = pick(MED_DOSES);
    const day = i === 0 ? today : addDays(today, -randInt(0, 2));
    const t = hm(randInt(7, 21));
    events.push({
      id: uid(`med-log-${i}`),
      title: `${name} (${dose})`,
      type: 'medicine_log',
      startAt: day,
      doseLabel: dose,
      takenAt: `${day}T${t}:00`,
      timesOfDay: [t],
      createdAt: now,
      updatedAt: now,
    });
  }

  // Weight series: 2–5 points over past weeks
  const baseWeight = 58 + Math.random() * 12; // 58–70 kg
  const weightDays = randInt(2, 5);
  for (let i = 0; i < weightDays; i++) {
    const day = addDays(today, -randInt(0, 28) - i * 3);
    const value = Math.round((baseWeight + i * (0.1 + Math.random() * 0.25)) * 10) / 10;
    events.push({
      id: uid(`weight-${i}`),
      title: `${value} kg`,
      type: 'indicator',
      startAt: day,
      timesOfDay: [hm(randInt(7, 10))],
      takenAt: `${day}T${hm(randInt(7, 10))}:00`,
      indicator: { kind: 'weight', value, unit: 'kg' },
      createdAt: now,
      updatedAt: now,
    });
  }

  // Calories: 1–3 logs on 1–3 recent days (sums per day)
  const calDays = randInt(1, 3);
  for (let d = 0; d < calDays; d++) {
    const day = addDays(today, -d);
    const logs = randInt(1, 3);
    for (let j = 0; j < logs; j++) {
      const value = randInt(350, 900);
      const t = hm(randInt(8, 20));
      events.push({
        id: uid(`cal-${d}-${j}`),
        title: `${value} kcal`,
        type: 'indicator',
        startAt: day,
        timesOfDay: [t],
        takenAt: `${day}T${t}:00`,
        indicator: { kind: 'calories', value, unit: 'kcal' },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Blood pressure: 1–3 readings (same day multi)
  const bpCount = randInt(1, 3);
  for (let i = 0; i < bpCount; i++) {
    const day = i === 0 ? today : addDays(today, -randInt(0, 5));
    const sys = randInt(108, 128);
    const dia = randInt(68, 84);
    const t = hm(randInt(7, 21));
    events.push({
      id: uid(`bp-${i}`),
      title: `${sys}/${dia} mmHg`,
      type: 'indicator',
      startAt: day,
      timesOfDay: [t],
      takenAt: `${day}T${t}:00`,
      indicator: {
        kind: 'blood_pressure' as IndicatorKind,
        value: sys,
        valueSecondary: dia,
        unit: 'mmHg',
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  // Optional extra reading
  if (Math.random() < 0.55) {
    const kind = pick(['heart_rate', 'temperature', 'kick_count'] as const);
    const day = addDays(today, -randInt(0, 3));
    const t = hm(randInt(9, 18));
    let value = 0;
    let unit = '';
    let title = '';
    if (kind === 'heart_rate') {
      value = randInt(68, 95);
      unit = 'bpm';
      title = `${value} bpm`;
    } else if (kind === 'temperature') {
      value = Math.round((36.2 + Math.random() * 1.1) * 10) / 10;
      unit = '°C';
      title = `${value} °C`;
    } else {
      value = randInt(4, 18);
      unit = 'kicks';
      title = `${value} kicks`;
    }
    events.push({
      id: uid(`ind-extra`),
      title,
      type: 'indicator',
      startAt: day,
      timesOfDay: [t],
      takenAt: `${day}T${t}:00`,
      indicator: { kind, value, unit },
      createdAt: now,
      updatedAt: now,
    });
  }

  // Appointment upcoming
  events.push({
    id: uid('appt'),
    title: pick(APPT_TITLES),
    type: 'appointment',
    startAt: addDays(today, randInt(2, 18)),
    timesOfDay: [hm(randInt(9, 16), pick([0, 15, 30, 45]))],
    notes: Math.random() < 0.5 ? 'Bring notes and ID' : undefined,
    notifyMinutesBefore: Math.random() < 0.7 ? [0] : undefined,
    createdAt: now,
    updatedAt: now,
  });

  // 1–2 reminders
  const rems = shuffle([...REMINDERS]).slice(0, randInt(1, 2));
  rems.forEach((title, i) => {
    events.push({
      id: uid(`rem-${i}`),
      title,
      type: 'reminder',
      startAt: today,
      timesOfDay: [hm(randInt(9, 18))],
      recurrence: Math.random() < 0.5 ? 'daily' : 'none',
      createdAt: now,
      updatedAt: now,
    });
  });

  // Note
  if (Math.random() < 0.8) {
    events.push({
      id: uid('note'),
      title: pick(NOTES),
      type: 'note',
      startAt: today,
      allDay: true,
      notes: 'Random sample note for demos',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Week-based medicine (sometimes)
  if (Math.random() < 0.5) {
    events.push({
      id: uid('week-med'),
      title: pick(MED_NAMES),
      type: 'medicine',
      fromBabyWeek: 0,
      toBabyWeek: randInt(10, 20),
      timesOfDay: [hm(21)],
      recurrence: 'daily',
      doseLabel: pick(MED_DOSES),
      createdAt: now,
      updatedAt: now,
    });
  }

  return events;
}

/**
 * Overwrite local profile, calendar, babies, and labor with a new random sample.
 * Does not wipe Ask history or the disclaimer ack. Turns Baby care on.
 */
export function loadDemoData(): {
  profile: PregnancyProfile;
  eventCount: number;
  babyCount: number;
  laborCount: number;
  weeksHint: string;
} {
  const profile = buildDemoProfile();
  const ga = getGestationalAge(profile);
  const latePregnancy = Boolean(ga?.isValid && ga.weeks >= 36);
  const babies = buildDemoBabies();
  const events = [...buildDemoEvents(profile), ...buildDemoBabyEvents(babies)];
  const labor = buildDemoLabor(babies, latePregnancy);

  saveProfile(profile);
  saveEvents(events);
  saveBabies(babies);
  saveLaborSessions(labor);

  const settings = getSettings();
  saveSettings({
    ...settings,
    babyCareEnabled: true,
    activeBabyId: babies[0]?.id,
    laborHomeMode: 'auto',
  });

  const weeksHint =
    ga && ga.totalDays >= 0
      ? formatWeekDay(ga.weeks, ga.days, 'en')
      : 'sample pregnancy';

  return {
    profile,
    eventCount: events.length,
    babyCount: babies.length,
    laborCount: labor.length,
    weeksHint,
  };
}
