/**
 * Randomized local sample data for demos / QA.
 * Writes only to this browser’s localStorage.
 */
import { saveEvents, saveProfile } from './store';
import {
  addDays,
  dueDateFromLmp,
  formatWeekDay,
  getGestationalAge,
  todayIso,
} from '../pregnancy/engine';
import type {
  CalendarEvent,
  IndicatorKind,
  PregnancyProfile,
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

/**
 * Random gestational age ~ weeks 8–28 (realistic demo range).
 */
export function buildDemoProfile(): PregnancyProfile {
  const now = new Date().toISOString();
  const daysPregnant = randInt(56, 196); // 8–28 weeks
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
 * Overwrite local profile + calendar with a new random sample set
 * (does not touch settings, Ask history, or disclaimer ack).
 */
export function loadDemoData(): {
  profile: PregnancyProfile;
  eventCount: number;
  weeksHint: string;
} {
  const profile = buildDemoProfile();
  const events = buildDemoEvents(profile);
  saveProfile(profile);
  saveEvents(events);

  const ga = getGestationalAge(profile);
  const weeksHint =
    ga && ga.totalDays >= 0
      ? formatWeekDay(ga.weeks, ga.days, 'en')
      : 'sample pregnancy';

  return { profile, eventCount: events.length, weeksHint };
}
