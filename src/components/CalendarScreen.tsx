import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, Plus } from 'lucide-react';
import { DayAgenda } from './DayAgenda';
import { eventTypeIcon } from './eventIcons';
import { MedicineAutocomplete } from './MedicineAutocomplete';
import { StyledCheckbox } from './ui/StyledCheckbox';
import { StyledDateField } from './ui/StyledDateField';
import { StyledSelect } from './ui/StyledSelect';
import { findDuplicateMedicinePlan } from '../core/calendar/duplicates';
import {
  CALENDAR_VIEWS,
  completeActionKey,
  EVENT_TYPES,
  localHm,
  parseTimesInput,
  preferredCompleteKind,
  statusLabelKey,
  type CalendarViewMode,
} from '../core/calendar/meta';
import { groupByBabyWeek, eventsForDate } from '../core/calendar/resolve';
import {
  daysInMonthGrid,
  formatMonthTitle,
  sameMonth,
  startOfWeekMonday,
  weekDaysFrom,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_ZH,
  addMonths,
} from '../core/calendar/grid';
import { getCompletion } from '../core/calendar/store';
import {
  formatIndicatorDisplay,
  getIndicatorMeta,
  INDICATORS,
} from '../core/indicators/catalog';
import { todayIso, addDays } from '../core/pregnancy/engine';
import type { AppState } from '../hooks/useAppState';
import type {
  CalendarEvent,
  EventType,
  IndicatorKind,
  Recurrence,
} from '../core/types';

type ScheduleMode = 'date' | 'week' | 'both';

const emptyForm = {
  title: '',
  type: 'medicine' as EventType,
  scheduleMode: 'both' as ScheduleMode,
  startAt: todayIso(),
  endAt: '',
  fromBabyWeek: '',
  toBabyWeek: '',
  timesOfDay: '',
  recurrence: 'daily' as Recurrence,
  notes: '',
  medicineKey: undefined as string | undefined,
  notify: false,
  indicatorKind: 'weight' as IndicatorKind,
  indicatorValue: '',
  indicatorValueSecondary: '',
  indicatorUnit: 'kg',
  indicatorCustomLabel: '',
  doseLabel: '',
  takenTime: '',
};

function getScrollMain(): HTMLElement | null {
  return document.querySelector('.app-main');
}

export function CalendarScreen({ state }: { state: AppState }) {
  const { events, saveEvent, removeEvent, markComplete, profile, settings, t } =
    state;
  const [view, setView] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState(todayIso());
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [showBackTop, setShowBackTop] = useState(false);
  const [dupConfirmName, setDupConfirmName] = useState<string | null>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  // Show back-to-top after scrolling down the list
  useEffect(() => {
    const main = getScrollMain();
    if (!main) return;
    const onScroll = () => {
      setShowBackTop(main.scrollTop > 220);
    };
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const weekDates = useMemo(() => weekDaysFrom(anchor), [anchor]);
  const monthCells = useMemo(() => daysInMonthGrid(anchor), [anchor]);
  const weekdayLabels =
    settings.locale === 'zh-Hant' ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN;

  const todayList = useMemo(
    () => eventsForDate(events, todayIso(), profile),
    [events, profile]
  );
  const selectedList = useMemo(
    () => eventsForDate(events, selectedDay, profile),
    [events, selectedDay, profile]
  );

  const scrollToTop = () => {
    getScrollMain()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const indicatorMeta = getIndicatorMeta(form.indicatorKind);

  type OpenPreset =
    | { type: 'medicine' }
    | { type: 'medicine_log' }
    | { type: 'indicator'; kind?: IndicatorKind }
    | { type: EventType };

  const openNew = (preset: OpenPreset | boolean = { type: 'medicine' }) => {
    // legacy: openNew(true) → indicator
    const p: OpenPreset =
      typeof preset === 'boolean'
        ? preset
          ? { type: 'indicator' }
          : { type: 'medicine' }
        : preset;

    setEditId(undefined);
    const isInd = p.type === 'indicator';
    const isMedLog = p.type === 'medicine_log';
    const kind =
      isInd && 'kind' in p && p.kind ? p.kind : ('weight' as IndicatorKind);
    const meta = getIndicatorMeta(kind);

    setForm({
      ...emptyForm,
      startAt: todayIso(),
      type: p.type,
      recurrence: isInd || isMedLog ? 'none' : 'daily',
      timesOfDay: '',
      scheduleMode: isInd || isMedLog ? 'date' : 'both',
      indicatorKind: kind,
      indicatorUnit: meta.defaultUnit,
      indicatorValue: '',
      takenTime: '',
      doseLabel: '',
      notify: false,
    });
    setSheetOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditId(e.id);
    const hasWeek = e.fromBabyWeek != null || e.toBabyWeek != null;
    const hasDate = !!e.startAt || !!e.endAt;
    let scheduleMode: ScheduleMode = 'date';
    if (hasWeek && hasDate) scheduleMode = 'both';
    else if (hasWeek) scheduleMode = 'week';
    const ind = e.indicator;
    const taken =
      e.takenAt?.slice(11, 16) || e.timesOfDay?.[0] || '';
    const timesStr = e.timesOfDay?.join(', ') ?? '';
    const hasTimes = (e.timesOfDay?.length ?? 0) > 0;
    setForm({
      title: e.title,
      type: e.type,
      scheduleMode,
      startAt: e.startAt?.slice(0, 10) ?? todayIso(),
      endAt: e.endAt?.slice(0, 10) ?? '',
      fromBabyWeek: e.fromBabyWeek != null ? String(e.fromBabyWeek) : '',
      toBabyWeek: e.toBabyWeek != null ? String(e.toBabyWeek) : '',
      timesOfDay: timesStr,
      recurrence: e.recurrence ?? 'none',
      notes: e.notes ?? '',
      medicineKey: e.medicineKey,
      notify: hasTimes && (e.notifyMinutesBefore?.length ?? 0) > 0,
      indicatorKind: ind?.kind ?? 'weight',
      indicatorValue: ind != null ? String(ind.value) : '',
      indicatorValueSecondary:
        ind?.valueSecondary != null ? String(ind.valueSecondary) : '',
      indicatorUnit: ind?.unit ?? getIndicatorMeta(ind?.kind ?? 'weight').defaultUnit,
      indicatorCustomLabel: ind?.customLabel ?? '',
      doseLabel: e.doseLabel ?? '',
      takenTime: taken,
    });
    setSheetOpen(true);
  };

  const setIndicatorKind = (kind: IndicatorKind) => {
    const meta = getIndicatorMeta(kind);
    setForm((f) => ({
      ...f,
      indicatorKind: kind,
      indicatorUnit: meta.defaultUnit,
      type: 'indicator',
    }));
  };

  const handleSave = (opts?: { allowDuplicateMedicine?: boolean }) => {
    const isIndicator = form.type === 'indicator';
    const isMedLog = form.type === 'medicine_log';
    if (!isIndicator && !form.title.trim()) return;
    if (isIndicator && form.indicatorValue === '') return;

    const useDate =
      isIndicator ||
      isMedLog ||
      form.scheduleMode === 'date' ||
      form.scheduleMode === 'both';
    const useWeek =
      !isIndicator &&
      !isMedLog &&
      (form.scheduleMode === 'week' || form.scheduleMode === 'both');
    const times = parseTimesInput(form.timesOfDay);

    let title = form.title.trim();
    let indicator = undefined as CalendarEvent['indicator'];
    let doseLabel: string | undefined;
    let takenAt: string | undefined;

    if (isIndicator) {
      const value = Number(form.indicatorValue);
      if (Number.isNaN(value)) return;
      const valueSecondary =
        form.indicatorValueSecondary !== ''
          ? Number(form.indicatorValueSecondary)
          : undefined;
      indicator = {
        kind: form.indicatorKind,
        value,
        valueSecondary:
          valueSecondary != null && !Number.isNaN(valueSecondary)
            ? valueSecondary
            : undefined,
        unit: form.indicatorUnit.trim(),
        customLabel:
          form.indicatorKind === 'custom'
            ? form.indicatorCustomLabel.trim() || undefined
            : undefined,
      };
      title = formatIndicatorDisplay(
        indicator.kind,
        indicator.value,
        indicator.unit,
        settings.locale,
        indicator.valueSecondary,
        indicator.customLabel
      );
      // Auto clock stamp so multiple BP/weight same day stay ordered
      // (form time optional override; default = now).
      const day = form.startAt || todayIso();
      const hm = form.takenTime.trim() || localHm();
      times.length = 0;
      times.push(hm);
      takenAt = `${day}T${hm}:00`;
    }

    if (isMedLog) {
      doseLabel = form.doseLabel.trim() || undefined;
      const hm = form.takenTime.trim();
      times.length = 0;
      if (hm) {
        takenAt = `${form.startAt || todayIso()}T${hm}:00`;
        times.push(hm);
      } else {
        takenAt = undefined;
      }
      if (doseLabel) {
        title = `${title} (${doseLabel})`;
      }
    }

    // Reminders only when a clock time exists (not for pure date-only non-readings)
    const canNotify =
      !isIndicator && !isMedLog && form.notify && times.length > 0;

    if (form.type === 'medicine' && !opts?.allowDuplicateMedicine) {
      const dup = findDuplicateMedicinePlan(events, {
        editId,
        type: form.type,
        title,
        medicineKey: form.medicineKey,
      });
      if (dup) {
        setDupConfirmName(dup.title);
        return;
      }
    }

    saveEvent({
      id: editId,
      title,
      type: form.type,
      startAt: useDate ? form.startAt || undefined : undefined,
      endAt:
        useDate && form.endAt && !isIndicator && !isMedLog
          ? form.endAt
          : undefined,
      fromBabyWeek:
        useWeek && form.fromBabyWeek !== ''
          ? Number(form.fromBabyWeek)
          : undefined,
      toBabyWeek:
        useWeek && form.toBabyWeek !== '' ? Number(form.toBabyWeek) : undefined,
      timesOfDay: times.length ? times : undefined,
      recurrence: isIndicator || isMedLog ? 'none' : form.recurrence,
      notes: form.notes.trim() || undefined,
      medicineKey: isIndicator ? undefined : form.medicineKey,
      notifyMinutesBefore: canNotify ? [0] : undefined,
      allDay: times.length === 0,
      indicator,
      doseLabel:
        isMedLog || form.type === 'medicine'
          ? form.doseLabel.trim() || undefined
          : undefined,
      takenAt: isIndicator || isMedLog ? takenAt : undefined,
    });
    setDupConfirmName(null);
    setSheetOpen(false);
  };

  const renderEvent = (e: CalendarEvent, dayIso: string = todayIso()) => {
    const Icon = eventTypeIcon(e.type);
    const done = getCompletion(e, dayIso);
    const primary = preferredCompleteKind(e.type);
    return (
      <div
        key={`${e.id}-${dayIso}`}
        className={`list-item event-row ${done ? 'is-complete' : ''}`}
      >
        <button
          type="button"
          className="event-main"
          onClick={() => openEdit(e)}
        >
          <div className="icon-bubble">
            <Icon size={18} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>
              {e.title}
              {done && (
                <span className="badge badge-green" style={{ marginLeft: 8 }}>
                  {t(statusLabelKey(done))}
                </span>
              )}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {t(`calendar.types.${e.type}`)}
              {e.doseLabel && e.type !== 'medicine_log'
                ? ` · ${e.doseLabel}`
                : ''}
              {e.timesOfDay?.length ? ` · ${e.timesOfDay.join(', ')}` : ''}
              {e.fromBabyWeek != null || e.toBabyWeek != null
                ? ` · ${
                    e.fromBabyWeek != null && e.toBabyWeek != null
                      ? t('calendar.weeksRange', {
                          a: e.fromBabyWeek,
                          b: e.toBabyWeek,
                        })
                      : e.toBabyWeek != null
                        ? t('calendar.untilWeek', { n: e.toBabyWeek })
                        : t('calendar.babyWeekTag', { n: e.fromBabyWeek! })
                  }`
                : ''}
            </div>
          </div>
        </button>
        <div className="event-actions">
          {done ? (
            <button
              type="button"
              className="chip"
              onClick={(ev) => {
                ev.stopPropagation();
                markComplete(e.id, dayIso, null);
              }}
            >
              {t('calendar.markClear')}
            </button>
          ) : (
            <button
              type="button"
              className="chip active"
              onClick={(ev) => {
                ev.stopPropagation();
                markComplete(e.id, dayIso, primary);
              }}
            >
              {t(completeActionKey(primary))}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('calendar.title')}</h1>
        </div>
      </header>

      <div className="cal-chrome">
        <div
          className="cal-view-bar"
          role="tablist"
          aria-label={t('calendar.title')}
        >
          {CALENDAR_VIEWS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={`cal-view-tab ${view === id ? 'is-active' : ''}`}
              onClick={() => {
                setView(id);
                if (id === 'week' || id === 'month') {
                  setAnchor(todayIso());
                  setSelectedDay(todayIso());
                }
                scrollToTop();
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <section className="quick-log-card" aria-label={t('calendar.quickLog')}>
          <div className="quick-log-head">
            <h2 className="quick-log-title">{t('calendar.quickLog')}</h2>
          </div>
          <div className="quick-log-grid">
            {EVENT_TYPES.map((type) => {
              const Icon = eventTypeIcon(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`quick-log-btn is-${type}`}
                  onClick={() => openNew({ type })}
                >
                  <span className={`quick-log-icon is-${type}`} aria-hidden>
                    <Icon size={18} strokeWidth={2.25} />
                  </span>
                  <span className="quick-log-label">
                    {t(`calendar.types.${type}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {(view === 'week' || view === 'month') && (
        <div className="cal-nav">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, padding: '0.35rem 0.65rem' }}
            onClick={() =>
              setAnchor((a) =>
                view === 'month' ? addMonths(a, -1) : addDays(startOfWeekMonday(a), -7)
              )
            }
          >
            ‹ {t('calendar.prev')}
          </button>
          <strong className="cal-nav-title">
            {view === 'month'
              ? formatMonthTitle(anchor, settings.locale)
              : `${weekDates[0]} – ${weekDates[6]}`}
          </strong>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 36, padding: '0.35rem 0.65rem' }}
            onClick={() =>
              setAnchor((a) =>
                view === 'month' ? addMonths(a, 1) : addDays(startOfWeekMonday(a), 7)
              )
            }
          >
            {t('calendar.next')} ›
          </button>
        </div>
      )}

      <section className="card cal-list-card">
        {view === 'today' && (
          <DayAgenda
            items={todayList}
            allEvents={events}
            dayIso={todayIso()}
            locale={settings.locale}
            t={t}
            onEdit={openEdit}
            onComplete={markComplete}
            emptyLabel={t('calendar.empty')}
            enableShare
          />
        )}

        {view === 'week' && (
          <div className="week-grid">
            {weekDates.map((d, i) => {
              const dayEvents = eventsForDate(events, d, profile);
              const isSel = d === selectedDay;
              const isToday = d === todayIso();
              return (
                <button
                  key={d}
                  type="button"
                  className={`week-day ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => setSelectedDay(d)}
                >
                  <div className="week-day-label">{weekdayLabels[i]}</div>
                  <div className="week-day-num">{Number(d.slice(8, 10))}</div>
                  <div className="week-day-dots">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`dot ${getCompletion(e, d) ? 'dot-done' : ''}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {view === 'month' && (
          <>
            <div className="month-weekdays">
              {weekdayLabels.map((l) => (
                <div key={l} className="month-wd">
                  {l}
                </div>
              ))}
            </div>
            <div className="month-grid">
              {monthCells.map((d) => {
                const inMonth = sameMonth(d, anchor);
                const dayEvents = eventsForDate(events, d, profile);
                const isSel = d === selectedDay;
                const isToday = d === todayIso();
                return (
                  <button
                    key={d}
                    type="button"
                    className={`month-cell ${inMonth ? '' : 'is-out'} ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                    onClick={() => {
                      setSelectedDay(d);
                      if (!inMonth) setAnchor(d);
                    }}
                  >
                    <span className="month-cell-num">{Number(d.slice(8, 10))}</span>
                    <span className="month-cell-dots" aria-hidden>
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`dot ${getCompletion(e, d) ? 'dot-done' : ''}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {(view === 'week' || view === 'month') && (
          <div className="day-detail">
            <div className="muted" style={{ fontWeight: 700, marginBottom: 8 }}>
              {selectedDay}{' '}
              {t('calendar.itemsOnDay', { n: selectedList.length })}
            </div>
            {selectedList.length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <DayAgenda
                items={selectedList}
                allEvents={events}
                dayIso={selectedDay}
                locale={settings.locale}
                t={t}
                onEdit={openEdit}
                onComplete={markComplete}
                enableShare
              />
            )}
          </div>
        )}

        {view === 'babyWeek' && (
          <>
            {events.length === 0 ? (
              <p className="muted">{t('calendar.empty')}</p>
            ) : (
              [...groupByBabyWeek(events, profile).entries()].map(
                ([week, list]) => (
                  <div key={week} className="cal-week-group">
                    <div className="cal-week-group-title muted">
                      {week < 0
                        ? '—'
                        : t('calendar.babyWeekTag', { n: week })}
                    </div>
                    {list.map((e) => renderEvent(e, todayIso()))}
                  </div>
                )
              )
            )}
          </>
        )}
      </section>

      {showBackTop && (
        <button
          type="button"
          className="fab-secondary"
          aria-label={t('calendar.backToTop')}
          title={t('calendar.backToTop')}
          onClick={scrollToTop}
        >
          <ChevronUp size={22} strokeWidth={2.5} />
        </button>
      )}

      <button
        type="button"
        className="fab"
        aria-label={t('calendar.add')}
        onClick={() => openNew({ type: 'medicine_log' })}
      >
        <Plus size={28} />
      </button>

      {sheetOpen &&
        createPortal(
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-handle" />
            <h2 className="sheet-title">
              {editId ? t('calendar.edit') : t('calendar.add')}
            </h2>

            <div className="field">
              <label>{t('calendar.type')}</label>
              <div className="chip-row">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${form.type === type ? 'active' : ''}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        type,
                        recurrence: type === 'indicator' ? 'none' : f.recurrence,
                        scheduleMode:
                          type === 'indicator' ? 'date' : f.scheduleMode,
                      }))
                    }
                  >
                    {t(`calendar.types.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'indicator' ? (
              <>
                <StyledSelect
                  label={t('calendar.indicatorKind')}
                  value={form.indicatorKind}
                  onChange={(v) => setIndicatorKind(v as IndicatorKind)}
                  options={INDICATORS.map((i) => ({
                    value: i.kind,
                    label: t(`calendar.indicatorKinds.${i.kind}`),
                  }))}
                />
                {form.indicatorKind === 'custom' && (
                  <div className="field">
                    <label>{t('calendar.indicatorCustomName')}</label>
                    <input
                      type="text"
                      value={form.indicatorCustomLabel}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          indicatorCustomLabel: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                {indicatorMeta.dual ? (
                  <>
                    <div className="field">
                      <label>{t('calendar.indicatorValueSys')}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.indicatorValue}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            indicatorValue: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>{t('calendar.indicatorValueDia')}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.indicatorValueSecondary}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            indicatorValueSecondary: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="field">
                    <label>{t('calendar.indicatorValue')}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={form.indicatorValue}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          indicatorValue: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div className="field">
                  <label>{t('calendar.indicatorUnit')}</label>
                  <input
                    type="text"
                    value={form.indicatorUnit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, indicatorUnit: e.target.value }))
                    }
                  />
                </div>
                <StyledDateField
                  label={t('calendar.startDate')}
                  value={form.startAt}
                  onChange={(startAt) => setForm((f) => ({ ...f, startAt }))}
                />
                <div className="field">
                  <label>{t('calendar.readingTime')}</label>
                  <input
                    type="time"
                    className="ui-time"
                    value={form.takenTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, takenTime: e.target.value }))
                    }
                  />
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {t('calendar.readingTimeHint')}
                  </p>
                </div>
              </>
            ) : form.type === 'medicine_log' ? (
              <>
                <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  {t('calendar.medicineLogHint')}
                </p>
                <div className="field">
                  <label>{t('calendar.titleLabel')}</label>
                  <MedicineAutocomplete
                    value={form.title}
                    locale={settings.locale}
                    placeholder={t('calendar.titlePlaceholder')}
                    onChange={(title, med) =>
                      setForm((f) => ({
                        ...f,
                        title,
                        medicineKey: med?.key ?? f.medicineKey,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>{t('calendar.doseLabel')}</label>
                  <input
                    type="text"
                    value={form.doseLabel}
                    placeholder={t('calendar.dosePlaceholder')}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, doseLabel: e.target.value }))
                    }
                  />
                </div>
                <StyledDateField
                  label={t('calendar.startDate')}
                  value={form.startAt}
                  onChange={(startAt) => setForm((f) => ({ ...f, startAt }))}
                />
                <div className="field">
                  <label>{t('calendar.takenTime')}</label>
                  <input
                    type="time"
                    className="ui-time"
                    value={form.takenTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, takenTime: e.target.value }))
                    }
                  />
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {t('calendar.takenTimeOptional')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label>{t('calendar.titleLabel')}</label>
                  <MedicineAutocomplete
                    value={form.title}
                    locale={settings.locale}
                    placeholder={t('calendar.titlePlaceholder')}
                    onChange={(title, med) =>
                      setForm((f) => ({
                        ...f,
                        title,
                        medicineKey: med?.key ?? f.medicineKey,
                        type: med && f.type !== 'medicine_log' ? 'medicine' : f.type,
                      }))
                    }
                  />
                </div>

                {(form.type === 'medicine' || form.type === 'reminder') && (
                  <div className="field">
                    <label>{t('calendar.doseLabel')}</label>
                    <input
                      type="text"
                      value={form.doseLabel}
                      placeholder={t('calendar.dosePlaceholder')}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, doseLabel: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="field">
                  <label>{t('calendar.scheduleMode')}</label>
                  <div className="chip-row">
                    {(
                      [
                        ['date', 'calendar.modeDate'],
                        ['week', 'calendar.modeWeek'],
                        ['both', 'calendar.modeBoth'],
                      ] as const
                    ).map(([id, key]) => (
                      <button
                        key={id}
                        type="button"
                        className={`chip ${form.scheduleMode === id ? 'active' : ''}`}
                        onClick={() =>
                          setForm((f) => ({ ...f, scheduleMode: id }))
                        }
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {(form.scheduleMode === 'date' ||
                  form.scheduleMode === 'both') && (
                  <>
                    <StyledDateField
                      label={t('calendar.startDate')}
                      value={form.startAt}
                      onChange={(startAt) => setForm((f) => ({ ...f, startAt }))}
                    />
                    <StyledDateField
                      label={t('calendar.endDate')}
                      value={form.endAt}
                      onChange={(endAt) => setForm((f) => ({ ...f, endAt }))}
                    />
                  </>
                )}

                {(form.scheduleMode === 'week' ||
                  form.scheduleMode === 'both') && (
                  <>
                    {!profile && (
                      <p className="disclaimer" style={{ marginBottom: '0.75rem' }}>
                        {t('calendar.needProfile')}
                      </p>
                    )}
                    <div className="field">
                      <label>{t('calendar.fromWeek')}</label>
                      <input
                        type="number"
                        min={0}
                        max={45}
                        value={form.fromBabyWeek}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fromBabyWeek: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>{t('calendar.toWeek')}</label>
                      <input
                        type="number"
                        min={0}
                        max={45}
                        placeholder={t('calendar.toWeekHint')}
                        value={form.toBabyWeek}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            toBabyWeek: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="field">
                  <label>{t('calendar.times')}</label>
                  <input
                    type="text"
                    value={form.timesOfDay}
                    placeholder={t('calendar.timesHint')}
                    onChange={(e) => {
                      const next = e.target.value;
                      const has = parseTimesInput(next).length > 0;
                      setForm((f) => ({
                        ...f,
                        timesOfDay: next,
                        // No time → no notification
                        notify: has ? f.notify : false,
                      }));
                    }}
                  />
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {t('calendar.timesOptional')}
                  </p>
                </div>

                <StyledSelect
                  label={t('calendar.recurrence')}
                  value={form.recurrence}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, recurrence: v as Recurrence }))
                  }
                  options={[
                    { value: 'none', label: t('calendar.recNone') },
                    { value: 'daily', label: t('calendar.recDaily') },
                    { value: 'weekly', label: t('calendar.recWeekly') },
                  ]}
                />

                {parseTimesInput(form.timesOfDay).length > 0 ? (
                  <StyledCheckbox
                    checked={form.notify}
                    onChange={(notify) => setForm((f) => ({ ...f, notify }))}
                    label={t('calendar.notify')}
                    id="cal-notify"
                  />
                ) : (
                  <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                    {t('calendar.notifyNeedsTime')}
                  </p>
                )}
              </>
            )}

            <div className="field">
              <label>{t('calendar.notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            {dupConfirmName && (
              <div className="card-soft stack" style={{ marginBottom: '0.75rem' }}>
                <p className="muted">
                  {t('calendar.duplicateMedicine', { name: dupConfirmName })}
                </p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setDupConfirmName(null)}
                  >
                    {t('calendar.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSave({ allowDuplicateMedicine: true })}
                  >
                    {t('calendar.save')}
                  </button>
                </div>
              </div>
            )}

            <div className="row-actions">
              {editId && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    removeEvent(editId);
                    setSheetOpen(false);
                  }}
                >
                  {t('calendar.delete')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setDupConfirmName(null);
                  setSheetOpen(false);
                }}
              >
                {t('calendar.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSave()}
              >
                {t('calendar.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
