import type {
  BabyProfile,
  CalendarEvent,
  DiaperDetails,
  FeedDetails,
  Locale,
  PumpDetails,
  SleepDetails,
  SpitupDetails,
  TummyDetails,
} from '../types';
import { formatBabyAge } from './age';
import { sleepDurationMs, tummyDurationMs } from './logs';

const FEED_METHOD: Record<FeedDetails['method'], [string, string]> = {
  breast: ['Breast', '親餵'],
  bottle: ['Bottle', '瓶餵'],
  formula: ['Formula', '配方'],
};

const FEED_SIDE: Record<NonNullable<FeedDetails['side']>, [string, string]> = {
  left: ['L', '左'],
  right: ['R', '右'],
  both: ['both', '雙邊'],
};

const DIAPER: Record<DiaperDetails['kind'], [string, string]> = {
  wet: ['Wet', '尿'],
  dirty: ['Dirty', '便'],
  mixed: ['Mixed', '尿+便'],
  dry: ['Dry', '乾'],
};

const SPITUP: Record<NonNullable<SpitupDetails['amount']>, [string, string]> = {
  small: ['Small', '少量'],
  medium: ['Medium', '中量'],
  large: ['Large', '大量'],
};

function pick(pair: [string, string], locale: Locale): string {
  return locale === 'zh-Hant' ? pair[1] : pair[0];
}

export function feedTitle(feed: FeedDetails, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  const parts = [zh ? '餵奶' : 'Feed', pick(FEED_METHOD[feed.method], locale)];
  if (feed.side) parts.push(pick(FEED_SIDE[feed.side], locale));
  if (feed.durationMinutes != null && feed.durationMinutes > 0) {
    parts.push(zh ? `${feed.durationMinutes} 分` : `${feed.durationMinutes} min`);
  }
  if (feed.amountMl != null && feed.amountMl > 0) {
    parts.push(`${feed.amountMl} ml`);
  }
  return parts.join(' · ');
}

export function diaperTitle(diaper: DiaperDetails, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  return `${zh ? '尿布' : 'Diaper'} · ${pick(DIAPER[diaper.kind], locale)}`;
}

export function pumpTitle(pump: PumpDetails, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  const parts = [zh ? '擠奶' : 'Pump'];
  if (pump.side) parts.push(pick(FEED_SIDE[pump.side], locale));
  if (pump.durationMinutes != null && pump.durationMinutes > 0) {
    parts.push(zh ? `${pump.durationMinutes} 分` : `${pump.durationMinutes} min`);
  }
  if (pump.amountMl != null && pump.amountMl > 0) {
    parts.push(`${pump.amountMl} ml`);
  }
  return parts.join(' · ');
}

export function tummyTitle(
  tummy: TummyDetails,
  locale: Locale,
  event?: CalendarEvent
): string {
  const zh = locale === 'zh-Hant';
  if (tummy.ongoing) return zh ? '趴姿進行中' : 'Tummy time';
  const mins =
    tummy.durationMinutes ??
    (event ? Math.round((tummyDurationMs(event) ?? 0) / 60_000) : 0);
  if (mins > 0) {
    return zh ? `趴姿 · ${mins} 分` : `Tummy time · ${mins} min`;
  }
  return zh ? '趴姿' : 'Tummy time';
}

export function spitupTitle(spitup: SpitupDetails, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  const base = zh ? '溢奶' : 'Spit-up';
  if (!spitup.amount) return base;
  return `${base} · ${pick(SPITUP[spitup.amount], locale)}`;
}

export function sleepTitle(
  sleep: SleepDetails,
  locale: Locale,
  event?: CalendarEvent
): string {
  const zh = locale === 'zh-Hant';
  if (sleep.ongoing) return zh ? '睡眠中' : 'Sleeping';
  const ms = event ? sleepDurationMs(event) : null;
  if (ms == null) return zh ? '睡眠' : 'Sleep';
  const mins = Math.max(1, Math.round(ms / 60_000));
  return zh ? `睡眠 · ${mins} 分` : `Sleep · ${mins} min`;
}

export function babyContextName(baby: BabyProfile, locale: Locale): string {
  const age = formatBabyAge(baby.birthDate, locale);
  return age ? `${baby.name} (${age})` : baby.name;
}

export function feedMethodLabel(method: FeedDetails['method'], locale: Locale): string {
  return pick(FEED_METHOD[method], locale);
}

export function feedSideLabel(
  side: NonNullable<FeedDetails['side']>,
  locale: Locale
): string {
  return pick(FEED_SIDE[side], locale);
}

export function diaperKindLabel(kind: DiaperDetails['kind'], locale: Locale): string {
  return pick(DIAPER[kind], locale);
}
