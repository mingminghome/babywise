/**
 * Plain-text formatting for sharing calendar items (copy / IM apps).
 */
import { getCompletion } from './store';
import { eventTimeLabel, statusLabelKey } from './meta';
import {
  getIndicatorMeta,
  indicatorLabel,
} from '../indicators/catalog';
import type { TFunction } from '../i18n';
import type { CalendarEvent, Locale } from '../types';

function typeLabel(e: CalendarEvent, t: TFunction): string {
  return t(`calendar.types.${e.type}`);
}

function formatReadingValue(e: CalendarEvent): string {
  const ind = e.indicator;
  if (!ind) return '';
  const meta = getIndicatorMeta(ind.kind);
  if (meta.dual && ind.valueSecondary != null) {
    return `${ind.value}/${ind.valueSecondary}${ind.unit ? ` ${ind.unit}` : ''}`;
  }
  return `${ind.value}${ind.unit ? ` ${ind.unit}` : ''}`;
}

function lineForEvent(
  e: CalendarEvent,
  dayIso: string,
  locale: Locale,
  t: TFunction
): string {
  const parts: string[] = [];
  const time = eventTimeLabel(e);
  if (time) parts.push(time);

  parts.push(e.title);

  if (e.type === 'medicine' || e.type === 'medicine_log') {
    if (e.doseLabel) parts.push(e.doseLabel);
    if (e.timesOfDay?.length && !time) {
      parts.push(e.timesOfDay.join(', '));
    }
  }

  if (e.type === 'indicator' && e.indicator) {
    const kind = e.indicator.kind;
    const label =
      kind === 'custom' && e.indicator.customLabel
        ? e.indicator.customLabel
        : indicatorLabel(kind, locale);
    if (label && label !== e.title) parts.push(label);
    const val = formatReadingValue(e);
    if (val) parts.push(val);
  }

  if (e.notes?.trim()) parts.push(e.notes.trim());

  const done = getCompletion(e, dayIso);
  if (done) parts.push(t(statusLabelKey(done)));

  // Prefix type in brackets for multi-type shares
  return `• [${typeLabel(e, t)}] ${parts.join(' · ')}`;
}

export type ShareFormatOpts = {
  events: CalendarEvent[];
  dayIso: string;
  locale: Locale;
  t: TFunction;
  /** Optional heading override */
  title?: string;
};

/** Human-readable text for clipboard / WhatsApp / Messages / etc. */
export function formatEventsForShare(opts: ShareFormatOpts): string {
  const { events, dayIso, locale, t } = opts;
  if (!events.length) return '';

  const header =
    opts.title?.trim() ||
    `BabyWise · ${dayIso}`;

  // Group by type for readability
  const order = [
    'medicine',
    'medicine_log',
    'appointment',
    'reminder',
    'note',
    'indicator',
  ] as const;
  const byType = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = byType.get(e.type) ?? [];
    arr.push(e);
    byType.set(e.type, arr);
  }

  const blocks: string[] = [header, ''];

  for (const type of order) {
    const list = byType.get(type);
    if (!list?.length) continue;
    blocks.push(t(`calendar.types.${type}`));
    for (const e of list) {
      blocks.push(lineForEvent(e, dayIso, locale, t));
    }
    blocks.push('');
  }

  // Any unexpected types
  for (const [type, list] of byType) {
    if ((order as readonly string[]).includes(type)) continue;
    blocks.push(type);
    for (const e of list) {
      blocks.push(lineForEvent(e, dayIso, locale, t));
    }
    blocks.push('');
  }

  return blocks.join('\n').trim() + '\n';
}
