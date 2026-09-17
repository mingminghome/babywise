import type { BabyProfile, CalendarEvent, Locale } from '../types';
import { formatReadingNumber } from '../indicators/catalog';
import { formatBabyAge } from './age';
import {
  diaperCountsOnDay,
  eventsOnDay,
  feedCountOnDay,
  lastOfType,
  pumpCountOnDay,
  sleepMinutesOnDay,
  spitupCountOnDay,
  tummyMinutesOnDay,
} from './logs';
import { todayIso } from '../pregnancy/engine';

/** Short Ask question (server text cap is 400 chars). Details go in context. */
export function buildBabyRecsQuestion(baby: BabyProfile, locale: Locale): string {
  const age = formatBabyAge(baby.birthDate, locale);
  if (locale === 'zh-Hant') {
    return `請依這位新生兒（${baby.name}，${age}）今天的餵奶、擠奶、尿布、睡眠與體重紀錄，說明常見照護範圍，以及什麼情況應聯絡醫護。這不是醫療診斷，請保守說明。`;
  }
  return `Please review this newborn (${baby.name}, ${age}) using today’s feed, pump, diaper, sleep, and weight logs. Share typical care ranges and when to contact a clinician. Not a diagnosis — stay cautious.`;
}

export function babyLogSummaryLines(
  baby: BabyProfile,
  events: CalendarEvent[],
  locale: Locale,
  dayIso = todayIso()
): string[] {
  const zh = locale === 'zh-Hant';
  const lines: string[] = [];
  const age = formatBabyAge(baby.birthDate, locale);
  lines.push(zh ? `寶寶：${baby.name}，${age}` : `Baby: ${baby.name}, ${age}`);
  if (baby.birthWeightKg != null) {
    lines.push(
      zh
        ? `出生體重 ${baby.birthWeightKg} kg`
        : `Birth weight ${baby.birthWeightKg} kg`
    );
  }

  const feeds = feedCountOnDay(events, baby.id, dayIso);
  lines.push(
    zh
      ? `今日餵奶 ${feeds.count} 次${feeds.amountMl ? `，共 ${feeds.amountMl} ml` : ''}`
      : `Feeds today: ${feeds.count}${feeds.amountMl ? `, ${feeds.amountMl} ml` : ''}`
  );
  const lastFeed = lastOfType(events, baby.id, 'feed');
  if (lastFeed) {
    lines.push(
      zh
        ? `最近餵奶：${lastFeed.title}`
        : `Last feed: ${lastFeed.title}`
    );
  }

  const pumps = pumpCountOnDay(events, baby.id, dayIso);
  if (pumps.count > 0) {
    lines.push(
      zh
        ? `今日擠奶 ${pumps.count} 次${pumps.amountMl ? `，共 ${pumps.amountMl} ml` : ''}`
        : `Pumped today: ${pumps.count}${pumps.amountMl ? `, ${pumps.amountMl} ml` : ''}`
    );
  }

  const diapers = diaperCountsOnDay(events, baby.id, dayIso);
  lines.push(
    zh
      ? `今日尿布 ${diapers.total}（尿 ${diapers.wet}、便 ${diapers.dirty}、混合 ${diapers.mixed}）`
      : `Diapers today: ${diapers.total} (wet ${diapers.wet}, dirty ${diapers.dirty}, mixed ${diapers.mixed})`
  );

  const sleepMin = sleepMinutesOnDay(events, baby.id, dayIso);
  lines.push(
    zh ? `今日睡眠約 ${sleepMin} 分` : `Sleep today ~ ${sleepMin} min`
  );
  const lastSleep = lastOfType(events, baby.id, 'sleep');
  if (lastSleep) {
    lines.push(
      zh ? `最近睡眠：${lastSleep.title}` : `Last sleep: ${lastSleep.title}`
    );
  }

  const tummyMin = tummyMinutesOnDay(events, baby.id, dayIso);
  if (tummyMin > 0) {
    lines.push(
      zh ? `今日趴姿約 ${tummyMin} 分` : `Tummy time today ~ ${tummyMin} min`
    );
  }
  const spitups = spitupCountOnDay(events, baby.id, dayIso);
  if (spitups > 0) {
    lines.push(zh ? `今日溢奶 ${spitups} 次` : `Spit-up today: ${spitups}`);
  }

  const todayLogs = eventsOnDay(events, baby.id, dayIso)
    .filter((e) => e.type === 'indicator' && e.indicator?.kind === 'weight')
    .toSorted((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
  const lastWeight =
    todayLogs[0] ??
    events
      .filter(
        (e) =>
          e.babyId === baby.id &&
          e.type === 'indicator' &&
          e.indicator?.kind === 'weight'
      )
      .toSorted((a, b) =>
        (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
      )[0];
  if (lastWeight?.indicator) {
    lines.push(
      zh
        ? `最近體重 ${formatReadingNumber(lastWeight.indicator.value)} ${lastWeight.indicator.unit}`
        : `Latest weight ${formatReadingNumber(lastWeight.indicator.value)} ${lastWeight.indicator.unit}`
    );
  }

  return lines;
}
