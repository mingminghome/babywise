/**
 * Typical well-baby visit timings (first year).
 * Not a national immunization schedule — clinic plans differ.
 */
import { addDays } from '../pregnancy/engine';
import type { BabyProfile, CalendarEvent, Locale } from '../types';

export type CheckupTemplate = {
  key: string;
  offsetDays: number;
  titleEn: string;
  titleZh: string;
};

export const WELL_BABY_CHECKUPS: readonly CheckupTemplate[] = [
  {
    key: '3d',
    offsetDays: 3,
    titleEn: 'Newborn check (about 3–5 days)',
    titleZh: '新生兒檢查（約 3–5 天）',
  },
  {
    key: '2w',
    offsetDays: 14,
    titleEn: '2-week check',
    titleZh: '滿 2 週檢查',
  },
  {
    key: '1m',
    offsetDays: 30,
    titleEn: '1-month check',
    titleZh: '滿月檢查',
  },
  {
    key: '2m',
    offsetDays: 61,
    titleEn: '2-month check / vaccines',
    titleZh: '滿 2 個月檢查／疫苗',
  },
  {
    key: '4m',
    offsetDays: 122,
    titleEn: '4-month check / vaccines',
    titleZh: '滿 4 個月檢查／疫苗',
  },
  {
    key: '6m',
    offsetDays: 183,
    titleEn: '6-month check / vaccines',
    titleZh: '滿 6 個月檢查／疫苗',
  },
  {
    key: '9m',
    offsetDays: 274,
    titleEn: '9-month check',
    titleZh: '滿 9 個月檢查',
  },
  {
    key: '12m',
    offsetDays: 365,
    titleEn: '12-month check / vaccines',
    titleZh: '滿 1 歲檢查／疫苗',
  },
  {
    key: '18m',
    offsetDays: 548,
    titleEn: '18-month check / vaccines',
    titleZh: '滿 18 個月檢查／疫苗',
  },
  {
    key: '24m',
    offsetDays: 730,
    titleEn: '24-month check / vaccines',
    titleZh: '滿 2 歲檢查／疫苗',
  },
];

export function checkupCareKey(babyId: string, templateKey: string): string {
  return `checkup:${babyId}:${templateKey}`;
}

export function missingCheckups(
  baby: BabyProfile,
  events: CalendarEvent[]
): CheckupTemplate[] {
  const have = new Set(
    events
      .filter((e) => e.babyId === baby.id && e.careKey)
      .map((e) => e.careKey as string)
  );
  return WELL_BABY_CHECKUPS.filter(
    (c) => !have.has(checkupCareKey(baby.id, c.key))
  );
}

export function buildCheckupEvent(
  baby: BabyProfile,
  template: CheckupTemplate,
  locale: Locale
): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  const zh = locale === 'zh-Hant';
  const startAt = addDays(baby.birthDate, template.offsetDays);
  const title = zh ? template.titleZh : template.titleEn;
  return {
    title: `${baby.name} · ${title}`,
    type: 'appointment',
    babyId: baby.id,
    startAt,
    allDay: false,
    timesOfDay: ['09:00'],
    notifyMinutesBefore: [60],
    recurrence: 'none',
    careKey: checkupCareKey(baby.id, template.key),
    notes: zh
      ? '常見時程提醒，不是國家疫苗時程。請向你的診所確認。'
      : 'Typical timing reminder — not a national vaccine schedule. Confirm with your clinic.',
  };
}
