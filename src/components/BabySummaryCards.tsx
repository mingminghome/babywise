import { useMemo, useState } from 'react';
import { Droplets, Milk, Moon, Scale } from 'lucide-react';
import {
  feedingHintId,
  feedingSnapshot,
  feedPeriodSummary,
  type SummaryPeriod,
} from '../core/baby/summaries';
import { formatReadingNumber } from '../core/indicators/catalog';
import { FoldCard } from './FoldCard';
import type { TFunction } from '../core/i18n';
import type { BabyProfile, CalendarEvent, Locale } from '../core/types';

const PERIODS: SummaryPeriod[] = ['day', 'week', 'month'];

type Props = {
  baby: BabyProfile;
  events: CalendarEvent[];
  t: TFunction;
  locale: Locale;
};

export function BabySummaryCards({ baby, events, t, locale: _locale }: Props) {
  const [period, setPeriod] = useState<SummaryPeriod>('day');
  const stats = useMemo(
    () => feedPeriodSummary(events, baby.id, period),
    [events, baby.id, period]
  );
  const snap = useMemo(
    () => feedingSnapshot(baby, events),
    [baby, events]
  );
  const todayStats = useMemo(
    () => feedPeriodSummary(events, baby.id, 'day'),
    [events, baby.id]
  );
  const todayWet = todayStats.wetDiapers;
  const hint = feedingHintId(snap, todayWet);
  const milk = stats.milkMl > 0 ? formatReadingNumber(stats.milkMl, 0) : '—';
  const pump = stats.pumpMl > 0 ? formatReadingNumber(stats.pumpMl, 0) : '—';
  const gap = (() => {
    if (snap.hoursSinceFeed == null) return t('baby.noneYet');
    const mins = Math.round(snap.hoursSinceFeed * 60);
    if (mins < 1) return t('baby.justNow');
    if (mins < 60) return t('baby.minutesAgo', { n: mins });
    return t('baby.hoursAgo', { n: Math.floor(snap.hoursSinceFeed) });
  })();

  const weightLine =
    snap.latestWeightKg != null
      ? `${formatReadingNumber(snap.latestWeightKg)} kg`
      : t('baby.noneYet');
  const delta =
    snap.weightDeltaKg != null
      ? `${snap.weightDeltaKg >= 0 ? '+' : ''}${formatReadingNumber(snap.weightDeltaKg)} kg`
      : null;

  return (
    <FoldCard
      foldId="baby-feeding"
      title={t('baby.feedingCardTitle')}
      t={t}
      className="card span-2 baby-summary-card"
      headerExtra={
        <div className="chip-row baby-period-row" role="tablist">
          {PERIODS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              className={`chip ${period === id ? 'active' : ''}`}
              onClick={() => setPeriod(id)}
            >
              {t(`baby.period.${id}`)}
            </button>
          ))}
        </div>
      }
    >

      <div className="baby-stat-grid">
        <div className="baby-stat">
          <Milk size={14} />
          <span className="muted">{t('baby.lastFeed')}</span>
          <strong>{gap}</strong>
        </div>
        <div className="baby-stat">
          <Droplets size={14} />
          <span className="muted">{t('baby.statWets')}</span>
          <strong>{todayWet}</strong>
        </div>
        <div className="baby-stat">
          <Scale size={14} />
          <span className="muted">{t('calendar.indicatorKinds.weight')}</span>
          <strong>{weightLine}</strong>
          {delta ? (
            <span className="muted">{t('baby.statVsBirth', { n: delta })}</span>
          ) : null}
        </div>
        <div className="baby-stat">
          <Moon size={14} />
          <span className="muted">{t('baby.statSleep')}</span>
          <strong>
            {todayStats.sleepMinutes > 0
              ? t('baby.statMins', { n: todayStats.sleepMinutes })
              : '—'}
          </strong>
        </div>
        <div className="baby-stat">
          <Milk size={14} />
          <span className="muted">{t('baby.statMilk')}</span>
          <strong>
            {milk}
            {stats.milkMl > 0 ? ' ml' : ''}
          </strong>
          <span className="muted">{t('baby.statFeeds', { n: stats.feeds })}</span>
        </div>
        <div className="baby-stat">
          <span className="muted">{t('baby.statBreast')}</span>
          <strong>
            {stats.breastMinutes > 0 ? `${stats.breastMinutes} min` : '—'}
          </strong>
          <span className="muted">
            {t('baby.methodBreast')} · {stats.byMethod.breast}
          </span>
        </div>
        <div className="baby-stat">
          <span className="muted">{t('baby.statBottle')}</span>
          <strong>{stats.byMethod.bottle + stats.byMethod.formula}</strong>
          <span className="muted">
            {t('baby.methodBottle')} / {t('baby.methodFormula')}
          </span>
        </div>
        <div className="baby-stat">
          <span className="muted">{t('baby.statPump')}</span>
          <strong>
            {pump}
            {stats.pumpMl > 0 ? ' ml' : ''}
          </strong>
          <span className="muted">{t('baby.statPumps', { n: stats.pumpCount })}</span>
        </div>
      </div>

      {hint ? (
        <p className="baby-feed-hint">{t(`baby.hint.${hint}`)}</p>
      ) : (
        <p className="muted baby-feed-hint">{t('baby.hint.none')}</p>
      )}
    </FoldCard>
  );
}
