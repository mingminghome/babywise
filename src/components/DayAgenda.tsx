import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  Pill,
  Share2,
  Square,
  StickyNote,
  X,
} from 'lucide-react';
import {
  completeActionKey,
  eventTimeLabel,
  preferredCompleteKind,
  sortByEventTime,
} from '../core/calendar/meta';
import { formatEventsForShare } from '../core/calendar/shareFormat';
import { getCompletion } from '../core/calendar/store';
import {
  chartableSeries,
  SUM_PER_DAY_KINDS,
  sumIndicatorOnDay,
} from '../core/indicators/series';
import {
  getIndicatorMeta,
  indicatorLabel,
} from '../core/indicators/catalog';
import { copyText } from '../core/util/clipboard';
import { canNativeShare, shareOrCopyText } from '../core/util/share';
import type { TFunction } from '../core/i18n';
import type {
  CalendarEvent,
  CompletionKind,
  IndicatorKind,
  Locale,
} from '../core/types';
import { ReadingChart } from './ReadingChart';

type Props = {
  items: CalendarEvent[];
  /** All events (for multi-point reading charts). */
  allEvents: CalendarEvent[];
  dayIso: string;
  locale: Locale;
  t: TFunction;
  onEdit: (e: CalendarEvent) => void;
  onComplete: (
    id: string,
    dayIso: string,
    kind: CompletionKind | null
  ) => void;
  emptyLabel?: string;
  /** When true, skip graphs (e.g. Home already shows trend charts above). */
  hideCharts?: boolean;
  /** Multi-select + copy / share to IM apps */
  enableShare?: boolean;
};

function formatReadingValue(e: CalendarEvent): string {
  const ind = e.indicator;
  if (!ind) return e.title;
  const meta = getIndicatorMeta(ind.kind);
  if (meta.dual && ind.valueSecondary != null) {
    return `${ind.value}/${ind.valueSecondary}`;
  }
  return String(ind.value);
}

/**
 * Single action control — pending = text chip; success = green icon button (no duplicate “Taken” badge).
 */
function Action({
  e,
  dayIso,
  t,
  onComplete,
}: {
  e: CalendarEvent;
  dayIso: string;
  t: TFunction;
  onComplete: Props['onComplete'];
}) {
  if (e.type === 'medicine_log' || e.type === 'note' || e.type === 'indicator') {
    return null;
  }
  const done = getCompletion(e, dayIso);
  const primary = preferredCompleteKind(e.type);
  if (done) {
    return (
      <button
        type="button"
        className="day-item-action is-success"
        aria-label={t('calendar.markClear')}
        title={t('calendar.markClear')}
        onClick={(ev) => {
          ev.stopPropagation();
          onComplete(e.id, dayIso, null);
        }}
      >
        <Check size={18} strokeWidth={2.75} aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="day-item-action is-primary"
      onClick={(ev) => {
        ev.stopPropagation();
        onComplete(e.id, dayIso, primary);
      }}
    >
      {t(completeActionKey(primary))}
    </button>
  );
}

function SelectMark({ on }: { on: boolean }) {
  return on ? (
    <CheckSquare size={20} className="day-select-mark is-on" aria-hidden />
  ) : (
    <Square size={20} className="day-select-mark" aria-hidden />
  );
}

/**
 * Today / day detail: different layout per event type.
 * Chartable readings (≥2 day-points) show as graphs; same-day calories are summed.
 */
export function DayAgenda({
  items,
  allEvents,
  dayIso,
  locale,
  t,
  onEdit,
  onComplete,
  emptyLabel,
  hideCharts = false,
  enableShare = false,
}: Props) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [shareInfo, setShareInfo] = useState<string | null>(null);

  // Reset selection when day changes
  useEffect(() => {
    setSelecting(false);
    setSelected(new Set());
    setShareInfo(null);
  }, [dayIso]);

  const shareableIds = useMemo(() => items.map((e) => e.id), [items]);
  const shareableSet = useMemo(() => new Set(shareableIds), [shareableIds]);

  const medicines = items.filter(
    (e) => e.type === 'medicine' || e.type === 'medicine_log'
  );
  const appointments = items.filter((e) => e.type === 'appointment');
  const reminders = items.filter((e) => e.type === 'reminder');
  const notes = items.filter((e) => e.type === 'note');
  const indicators = items.filter((e) => e.type === 'indicator');

  const charted = chartableSeries(allEvents);
  const chartedKinds = new Set(charted.map((c) => c.kind));

  const chartsForDay = hideCharts
    ? []
    : charted.filter((c) => c.points.some((p) => p.date === dayIso));

  // Sum-kinds (calories / kicks): one total tile
  const sumTiles: Array<{
    kind: IndicatorKind;
    total: number;
    count: number;
    unit?: string;
    sampleEvent: CalendarEvent;
  }> = [];
  const sumKindsOnDay = new Set<IndicatorKind>();
  for (const kind of SUM_PER_DAY_KINDS) {
    const s = sumIndicatorOnDay(allEvents, kind, dayIso);
    if (!s || s.count === 0) continue;
    const sample =
      indicators.find((e) => e.indicator?.kind === kind) ??
      allEvents.find(
        (e) =>
          e.type === 'indicator' &&
          e.indicator?.kind === kind &&
          (e.startAt ?? e.createdAt).slice(0, 10) === dayIso
      );
    if (!sample) continue;
    sumKindsOnDay.add(kind);
    if (chartedKinds.has(kind) && !hideCharts) continue;
    if (chartedKinds.has(kind) && hideCharts && s.count < 2) continue;
    sumTiles.push({
      kind,
      total: s.total,
      count: s.count,
      unit: s.unit,
      sampleEvent: sample,
    });
  }

  // Multi-record vitals (BP, weight, …): timed list; charts use latest of day
  const multiVitalGroups: Array<{
    kind: IndicatorKind;
    list: CalendarEvent[];
  }> = [];
  const multiKinds = new Set<IndicatorKind>();
  const byKind = new Map<IndicatorKind, CalendarEvent[]>();
  for (const e of indicators) {
    const kind = e.indicator?.kind;
    if (!kind || sumKindsOnDay.has(kind)) continue;
    const arr = byKind.get(kind) ?? [];
    arr.push(e);
    byKind.set(kind, arr);
  }
  for (const [kind, list] of byKind) {
    if (list.length < 2) continue;
    multiKinds.add(kind);
    multiVitalGroups.push({
      kind,
      list: [...list].sort(sortByEventTime),
    });
  }

  // Single non-sum, non-multi readings (and not fully replaced by chart-only)
  const indicatorTiles = indicators.filter((e) => {
    const kind = e.indicator?.kind;
    if (!kind) return true;
    if (sumKindsOnDay.has(kind)) return false;
    if (multiKinds.has(kind)) return false;
    if (chartedKinds.has(kind)) return false;
    return true;
  });

  const hasAnything =
    medicines.length +
      appointments.length +
      reminders.length +
      notes.length +
      indicatorTiles.length +
      sumTiles.length +
      multiVitalGroups.length +
      chartsForDay.length >
    0;

  const toggleId = (id: string) => {
    if (!shareableSet.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onItemActivate = (e: CalendarEvent) => {
    if (selecting) {
      toggleId(e.id);
      return;
    }
    onEdit(e);
  };

  const selectAll = () => setSelected(new Set(shareableIds));
  const clearSelection = () => setSelected(new Set());

  const exitSelect = () => {
    setSelecting(false);
    clearSelection();
    setShareInfo(null);
  };

  const selectedEvents = useMemo(
    () => items.filter((e) => selected.has(e.id)),
    [items, selected]
  );

  const runShare = async (events: CalendarEvent[], preferCopy: boolean) => {
    setShareInfo(null);
    if (!events.length) {
      setShareInfo(t('calendar.shareNeedSelect'));
      return;
    }
    const text = formatEventsForShare({
      events,
      dayIso,
      locale,
      t,
    });
    if (preferCopy) {
      const ok = await copyText(text);
      setShareInfo(ok ? t('calendar.shareCopied') : t('calendar.shareFailed'));
      return;
    }
    const res = await shareOrCopyText({
      title: `BabyWise · ${dayIso}`,
      text,
    });
    if (res.ok) {
      setShareInfo(
        res.via === 'share' ? t('calendar.shareOpened') : t('calendar.shareCopied')
      );
      if (selecting) exitSelect();
    } else if (res.reason === 'cancelled') {
      /* user closed sheet */
    } else {
      setShareInfo(t('calendar.shareFailed'));
    }
  };

  if (!hasAnything) {
    return (
      <p className="muted">{emptyLabel ?? t('calendar.empty')}</p>
    );
  }

  const showShareUi = enableShare && items.length > 0;
  const allSelected =
    shareableIds.length > 0 && shareableIds.every((id) => selected.has(id));

  return (
    <div className={`day-agenda ${selecting ? 'is-selecting' : ''}`}>
      {showShareUi && (
        <div className="day-share-toolbar">
          {!selecting ? (
            <>
              <button
                type="button"
                className="btn btn-ghost day-share-btn"
                onClick={() => setSelecting(true)}
              >
                <CheckSquare size={15} />
                {t('calendar.select')}
              </button>
              <button
                type="button"
                className="btn btn-ghost day-share-btn"
                onClick={() => void runShare(items, false)}
              >
                <Share2 size={15} />
                {t('calendar.shareDay')}
              </button>
              <button
                type="button"
                className="btn btn-ghost day-share-btn"
                onClick={() => void runShare(items, true)}
              >
                <Copy size={15} />
                {t('calendar.copyDay')}
              </button>
            </>
          ) : (
            <>
              <span className="day-share-count muted">
                {t('calendar.selectedCount', { n: selected.size })}
              </span>
              <button
                type="button"
                className="btn btn-ghost day-share-btn"
                onClick={() => (allSelected ? clearSelection() : selectAll())}
              >
                {allSelected ? t('calendar.deselectAll') : t('calendar.selectAll')}
              </button>
              <button
                type="button"
                className="btn btn-ghost day-share-btn"
                onClick={exitSelect}
              >
                <X size={15} />
                {t('calendar.selectCancel')}
              </button>
            </>
          )}
        </div>
      )}

      {shareInfo && !selecting && (
        <p className="day-share-toast muted" role="status">
          {shareInfo}
        </p>
      )}

      {medicines.length > 0 && (
        <section className="day-section">
          <h3 className="day-section-title">
            <Pill size={15} aria-hidden />
            {t('calendar.sectionMedicine')}
          </h3>
          <div className="day-section-body">
            {medicines.map((e) => {
              const done = getCompletion(e, dayIso);
              const isLog = e.type === 'medicine_log';
              const isSel = selected.has(e.id);
              return (
                <article
                  key={e.id}
                  className={`day-card day-card-med ${done || isLog ? 'is-done' : ''} ${isLog ? 'is-log' : ''} ${isSel ? 'is-selected' : ''}`}
                >
                  {selecting && (
                    <button
                      type="button"
                      className="day-select-hit"
                      aria-pressed={isSel}
                      aria-label={t('calendar.selectItem')}
                      onClick={() => toggleId(e.id)}
                    >
                      <SelectMark on={isSel} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="day-card-main"
                    onClick={() => onItemActivate(e)}
                  >
                    <span
                      className={`day-card-icon is-medicine ${done || isLog ? 'is-ok' : ''}`}
                      aria-hidden
                    >
                      {isLog || done ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Pill size={18} />
                      )}
                    </span>
                    <div className="day-card-copy">
                      <div className="day-card-title">{e.title}</div>
                      <div className="day-card-meta muted">
                        {isLog
                          ? t('calendar.types.medicine_log')
                          : t('calendar.types.medicine')}
                        {e.doseLabel && !isLog ? ` · ${e.doseLabel}` : ''}
                        {e.timesOfDay?.length
                          ? ` · ${e.timesOfDay.join(', ')}`
                          : ''}
                      </div>
                    </div>
                  </button>
                  {!selecting &&
                    (isLog ? (
                      <span
                        className="day-item-action is-success is-static"
                        aria-hidden
                      >
                        <Check size={18} strokeWidth={2.75} />
                      </span>
                    ) : (
                      <Action
                        e={e}
                        dayIso={dayIso}
                        t={t}
                        onComplete={onComplete}
                      />
                    ))}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {appointments.length > 0 && (
        <section className="day-section">
          <h3 className="day-section-title">
            <CalendarClock size={15} aria-hidden />
            {t('calendar.sectionAppointment')}
          </h3>
          <div className="day-section-body">
            {appointments.map((e) => {
              const done = getCompletion(e, dayIso);
              const time = e.timesOfDay?.[0];
              const isSel = selected.has(e.id);
              return (
                <article
                  key={e.id}
                  className={`day-card day-card-appt ${done ? 'is-done' : ''} ${isSel ? 'is-selected' : ''}`}
                >
                  {selecting && (
                    <button
                      type="button"
                      className="day-select-hit"
                      aria-pressed={isSel}
                      aria-label={t('calendar.selectItem')}
                      onClick={() => toggleId(e.id)}
                    >
                      <SelectMark on={isSel} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="day-card-main"
                    onClick={() => onItemActivate(e)}
                  >
                    {time ? (
                      <span className="day-card-time">{time}</span>
                    ) : (
                      <span
                        className={`day-card-icon is-appointment ${done ? 'is-ok' : ''}`}
                        aria-hidden
                      >
                        {done ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <CalendarClock size={18} />
                        )}
                      </span>
                    )}
                    <div className="day-card-copy">
                      <div className="day-card-title">{e.title}</div>
                      <div className="day-card-meta muted">
                        {t('calendar.types.appointment')}
                        {e.notes ? ` · ${e.notes}` : ''}
                      </div>
                    </div>
                  </button>
                  {!selecting && (
                    <Action e={e} dayIso={dayIso} t={t} onComplete={onComplete} />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {reminders.length > 0 && (
        <section className="day-section">
          <h3 className="day-section-title">
            <Bell size={15} aria-hidden />
            {t('calendar.sectionReminder')}
          </h3>
          <div className="day-section-body">
            {reminders.map((e) => {
              const done = getCompletion(e, dayIso);
              const isSel = selected.has(e.id);
              return (
                <article
                  key={e.id}
                  className={`day-card day-card-rem ${done ? 'is-done' : ''} ${isSel ? 'is-selected' : ''}`}
                >
                  {selecting && (
                    <button
                      type="button"
                      className="day-select-hit"
                      aria-pressed={isSel}
                      aria-label={t('calendar.selectItem')}
                      onClick={() => toggleId(e.id)}
                    >
                      <SelectMark on={isSel} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="day-card-main"
                    onClick={() => onItemActivate(e)}
                  >
                    <span
                      className={`day-card-icon is-reminder ${done ? 'is-ok' : ''}`}
                      aria-hidden
                    >
                      {done ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </span>
                    <div className="day-card-copy">
                      <div className="day-card-title">{e.title}</div>
                      <div className="day-card-meta muted">
                        {t('calendar.types.reminder')}
                        {e.timesOfDay?.length
                          ? ` · ${e.timesOfDay.join(', ')}`
                          : ''}
                      </div>
                    </div>
                  </button>
                  {!selecting && (
                    <Action e={e} dayIso={dayIso} t={t} onComplete={onComplete} />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section className="day-section">
          <h3 className="day-section-title">
            <StickyNote size={15} aria-hidden />
            {t('calendar.sectionNote')}
          </h3>
          <div className="day-section-body day-notes-grid">
            {notes.map((e) => {
              const isSel = selected.has(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`day-note ${isSel ? 'is-selected' : ''}`}
                  onClick={() => onItemActivate(e)}
                >
                  {selecting && <SelectMark on={isSel} />}
                  <StickyNote size={14} className="day-note-icon" aria-hidden />
                  <strong>{e.title}</strong>
                  {e.notes && <p className="muted">{e.notes}</p>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {(chartsForDay.length > 0 ||
        indicatorTiles.length > 0 ||
        sumTiles.length > 0 ||
        multiVitalGroups.length > 0) && (
        <section className="day-section">
          <h3 className="day-section-title">
            <Activity size={15} aria-hidden />
            {t('calendar.sectionReading')}
          </h3>
          <div className="day-section-body">
            {chartsForDay.map(({ kind, points }) => {
              const dayPoint = points.find((p) => p.date === dayIso);
              return (
                <div key={kind} className="day-chart-wrap">
                  <ReadingChart
                    kind={kind}
                    points={points}
                    locale={locale}
                    unitHint={getIndicatorMeta(kind).defaultUnit}
                  />
                  {dayPoint &&
                    (dayPoint.sampleCount ?? 1) > 1 &&
                    SUM_PER_DAY_KINDS.includes(kind) && (
                      <p className="muted day-chart-sum-hint">
                        {t('calendar.caloriesDayTotal', {
                          n: dayPoint.sampleCount ?? 1,
                        })}
                        {`: ${dayPoint.value}${
                          getIndicatorMeta(kind).defaultUnit
                            ? ` ${getIndicatorMeta(kind).defaultUnit}`
                            : ''
                        }`}
                      </p>
                    )}
                  {dayPoint &&
                    (dayPoint.sampleCount ?? 1) > 1 &&
                    !SUM_PER_DAY_KINDS.includes(kind) && (
                      <p className="muted day-chart-sum-hint">
                        {t('calendar.readingLatestOf', {
                          n: dayPoint.sampleCount ?? 1,
                        })}
                      </p>
                    )}
                </div>
              );
            })}

            {multiVitalGroups.map(({ kind, list }) => (
              <div key={`mv-${kind}`} className="day-vital-group">
                <div className="day-vital-group-head">
                  <strong>{indicatorLabel(kind, locale)}</strong>
                  <span className="muted">
                    {t('calendar.readingLatestOf', { n: list.length })}
                  </span>
                </div>
                <ul className="day-vital-list">
                  {list.map((e) => {
                    const clock = eventTimeLabel(e);
                    const unit = e.indicator?.unit;
                    const isSel = selected.has(e.id);
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          className={`day-vital-row ${isSel ? 'is-selected' : ''}`}
                          onClick={() => onItemActivate(e)}
                        >
                          {selecting && <SelectMark on={isSel} />}
                          <span className="day-vital-time">
                            {clock || '—'}
                          </span>
                          <span className="day-vital-value">
                            {formatReadingValue(e)}
                            {unit ? (
                              <span className="day-reading-unit">{unit}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {(sumTiles.length > 0 || indicatorTiles.length > 0) && (
              <div className="day-reading-tiles">
                {sumTiles.map((tile) => {
                  const isSel = selected.has(tile.sampleEvent.id);
                  return (
                    <button
                      key={`sum-${tile.kind}`}
                      type="button"
                      className={`day-reading-tile is-sum ${isSel ? 'is-selected' : ''}`}
                      onClick={() => onItemActivate(tile.sampleEvent)}
                    >
                      {selecting && <SelectMark on={isSel} />}
                      <span className="day-reading-label muted">
                        {indicatorLabel(tile.kind, locale)}
                      </span>
                      <span className="day-reading-value">
                        {tile.total}
                        {tile.unit ? (
                          <span className="day-reading-unit">{tile.unit}</span>
                        ) : null}
                      </span>
                      {tile.count > 1 && (
                        <span className="day-reading-sub muted">
                          {t('calendar.caloriesDayTotal', { n: tile.count })}
                        </span>
                      )}
                    </button>
                  );
                })}
                {indicatorTiles.map((e) => {
                  const ind = e.indicator;
                  const kind = (ind?.kind ?? 'custom') as IndicatorKind;
                  const label =
                    kind === 'custom' && ind?.customLabel
                      ? ind.customLabel
                      : indicatorLabel(kind, locale);
                  const clock = eventTimeLabel(e);
                  const isSel = selected.has(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      className={`day-reading-tile ${isSel ? 'is-selected' : ''}`}
                      onClick={() => onItemActivate(e)}
                    >
                      {selecting && <SelectMark on={isSel} />}
                      <span className="day-reading-label muted">{label}</span>
                      <span className="day-reading-value">
                        {formatReadingValue(e)}
                        {ind?.unit ? (
                          <span className="day-reading-unit">{ind.unit}</span>
                        ) : null}
                      </span>
                      {clock && (
                        <span className="day-reading-sub muted">{clock}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {selecting && (
        <div className="day-share-bar" role="toolbar" aria-label={t('calendar.share')}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={selected.size === 0}
            onClick={() => void runShare(selectedEvents, true)}
          >
            <Copy size={16} />
            {t('calendar.copy')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={() => void runShare(selectedEvents, false)}
          >
            <Share2 size={16} />
            {canNativeShare() ? t('calendar.share') : t('calendar.copy')}
          </button>
          {shareInfo ? (
            <span className="day-share-bar-info muted">{shareInfo}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
