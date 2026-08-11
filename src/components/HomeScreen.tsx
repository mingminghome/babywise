import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  MessageCircleQuestion,
  Pencil,
} from 'lucide-react';
import {
  dateInputHint,
  dueDateFromLmp,
  formatClinicalAge,
  formatIsoDate,
  formatWeekDay,
  lmpFromDueDate,
  previewGestationalAge,
  progressPercent,
  todayIso,
} from '../core/pregnancy/engine';
import type { GestationalAge } from '../core/types';
import { eventsForDate } from '../core/calendar/resolve';
import { getIndicatorMeta } from '../core/indicators/catalog';
import { chartableSeries } from '../core/indicators/series';
import { DayAgenda } from './DayAgenda';
import { InstallAppBanner } from './InstallAppBanner';
import { ReadingChart } from './ReadingChart';
import { StyledDateField } from './ui/StyledDateField';
import type { AppState } from '../hooks/useAppState';
import type { ProfileMethod } from '../core/types';

export function HomeScreen({ state }: { state: AppState }) {
  const {
    profile,
    updateProfile,
    settings,
    t,
    ga,
    events,
    setTab,
    markComplete,
  } = state;
  const seriesList = useMemo(() => chartableSeries(events), [events]);
  const [editing, setEditing] = useState(!profile);
  // Default: first day of last period (stored as method `lmp` — UI never says "LMP")
  const [method, setMethod] = useState<ProfileMethod>(profile?.method ?? 'lmp');
  const [dateValue, setDateValue] = useState(
    profile?.method === 'due_date' ? profile.dueDate ?? '' : profile?.lmpDate ?? ''
  );

  const todayItems = eventsForDate(events, todayIso(), profile);
  const locale = settings.locale;

  const draftGa = useMemo(
    () => (editing ? previewGestationalAge(method, dateValue) : null),
    [editing, method, dateValue]
  );
  const draftHint = useMemo(
    () => (editing ? dateInputHint(method, dateValue) : 'empty'),
    [editing, method, dateValue]
  );

  /** Switch LMP ↔ due date without changing the underlying pregnancy. */
  const selectMethod = (next: ProfileMethod) => {
    if (next === method) return;
    if (dateValue) {
      setDateValue(
        next === 'due_date' ? dueDateFromLmp(dateValue) : lmpFromDueDate(dateValue)
      );
    }
    setMethod(next);
  };

  const handleSave = () => {
    if (!dateValue) return;
    const now = new Date().toISOString();
    updateProfile({
      method,
      // Only the field for the chosen method is authoritative; engine derives the other.
      lmpDate: method === 'lmp' ? dateValue : undefined,
      dueDate: method === 'due_date' ? dateValue : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    });
    setEditing(false);
  };

  const progress = progressPercent(ga);
  const showSetup = editing || !profile || !ga;

  const ageLabel = (g: GestationalAge) =>
    g.totalDays < 0
      ? t('home.notStarted')
      : formatWeekDay(g.weeks, g.days, locale);

  const hintMessage =
    draftHint === 'lmp_future'
      ? t('home.hintLmpFuture')
      : draftHint === 'lmp_old'
        ? t('home.hintLmpOld')
        : draftHint === 'due_past'
          ? t('home.hintDuePast')
          : draftHint === 'due_far'
            ? t('home.hintDueFar')
            : null;

  return (
    <>
      <InstallAppBanner t={t} />

      {showSetup ? (
        <section className="card setup-dates span-2">
          <header className="setup-dates-head">
            <span className="setup-dates-icon" aria-hidden>
              <CalendarHeart size={20} strokeWidth={2.25} />
            </span>
            <div className="setup-dates-copy">
              <h2 className="section-title setup-dates-title">{t('home.setUp')}</h2>
              <p className="muted setup-dates-hint">{t('home.setUpHint')}</p>
            </div>
          </header>

          <p className="setup-dates-step">{t('home.setUpStep1')}</p>
          <div
            className="setup-method-grid"
            role="group"
            aria-label={t('home.setUpStep1')}
          >
            <button
              type="button"
              className={`setup-method ${method === 'lmp' ? 'is-active' : ''}`}
              aria-pressed={method === 'lmp'}
              onClick={() => selectMethod('lmp')}
            >
              <span className="setup-method-icon" aria-hidden>
                <CalendarDays size={18} strokeWidth={2.25} />
              </span>
              <span className="setup-method-label">{t('home.methodLmp')}</span>
            </button>
            <button
              type="button"
              className={`setup-method ${method === 'due_date' ? 'is-active' : ''}`}
              aria-pressed={method === 'due_date'}
              onClick={() => selectMethod('due_date')}
            >
              <span className="setup-method-icon" aria-hidden>
                <CalendarHeart size={18} strokeWidth={2.25} />
              </span>
              <span className="setup-method-label">{t('home.methodDue')}</span>
            </button>
          </div>

          <p className="setup-dates-step">{t('home.setUpStep2')}</p>
          <StyledDateField
            id="preg-date"
            label={method === 'lmp' ? t('home.lmp') : t('home.dueDate')}
            value={dateValue}
            onChange={setDateValue}
          />

          {draftGa && (
            <div className="setup-preview" aria-live="polite">
              <div className="setup-preview-label">{t('home.previewTitle')}</div>
              <div className="setup-preview-week">
                <span className="setup-preview-week-main">{ageLabel(draftGa)}</span>
                {draftGa.totalDays >= 0 && (
                  <span className="setup-preview-clinical">
                    {formatClinicalAge(draftGa.weeks, draftGa.days)}
                  </span>
                )}
              </div>
              <ul className="setup-preview-meta">
                <li>
                  {method === 'lmp'
                    ? t('home.previewDerivedDue', {
                        date: formatIsoDate(draftGa.dueDate, locale),
                      })
                    : t('home.previewDerivedLmp', {
                        date: formatIsoDate(draftGa.lmpDate, locale),
                      })}
                </li>
                <li>
                  {draftGa.daysUntilDue >= 0
                    ? t('home.daysLeft', { n: draftGa.daysUntilDue })
                    : t('home.overdue', { n: Math.abs(draftGa.daysUntilDue) })}
                </li>
                {draftGa.trimester && (
                  <li>{t('home.trimesterN', { n: draftGa.trimester })}</li>
                )}
              </ul>
              <p className="setup-preview-hint muted">
                {method === 'due_date'
                  ? t('home.previewHintDue')
                  : t('home.previewHintLmp')}
              </p>
            </div>
          )}

          {hintMessage && (
            <p className="setup-date-warning" role="status">
              {hintMessage}
            </p>
          )}

          <div className="setup-dates-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!dateValue}
              onClick={handleSave}
            >
              {t('home.save')}
            </button>
            {profile && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => setEditing(false)}
              >
                {t('calendar.cancel')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="layout-grid">
          <section className="hero-week span-2">
            <button
              type="button"
              className="hero-edit"
              aria-label={t('home.editDates')}
              title={t('home.editDates')}
              onClick={() => {
                setMethod(profile.method);
                setDateValue(
                  profile.method === 'lmp'
                    ? profile.lmpDate ?? ''
                    : profile.dueDate ?? ''
                );
                setEditing(true);
              }}
            >
              <Pencil size={16} strokeWidth={2.25} />
            </button>
            <div className="hero-week-inner">
              <div className="hero-week-label">{t('home.weekLabel')}</div>
              <div className="week-big">{ageLabel(ga)}</div>
              {ga.totalDays >= 0 && (
                <div className="hero-clinical" title={t('home.clinicalAge', { age: formatClinicalAge(ga.weeks, ga.days) })}>
                  {formatClinicalAge(ga.weeks, ga.days)}
                </div>
              )}
              {ga.trimester && (
                <div className="hero-trimester-chip">
                  {t('home.trimesterN', { n: ga.trimester })}
                </div>
              )}
              <div className="hero-week-meta">
                <span>
                  {t('home.dueOn', { date: formatIsoDate(ga.dueDate, locale) })}
                </span>
                <span className="hero-meta-dot" aria-hidden>
                  ·
                </span>
                <span>
                  {ga.daysUntilDue >= 0
                    ? t('home.daysLeft', { n: ga.daysUntilDue })
                    : t('home.overdue', { n: Math.abs(ga.daysUntilDue) })}
                </span>
              </div>
              {ga.totalDays >= 0 && (
                <div
                  className="progress-track"
                  aria-label={`${Math.round(progress)}%`}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </section>

          <div className="row-actions home-quick-actions span-2">
            <button type="button" className="btn btn-primary" onClick={() => setTab('calendar')}>
              <CalendarPlus size={16} />
              {t('home.addItem')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setTab('ask')}>
              <MessageCircleQuestion size={16} />
              {t('home.askQuick')}
            </button>
          </div>

          {seriesList.length > 0 && (
            <section className="card span-2">
              <h2 className="section-title">{t('home.chartsTitle')}</h2>
              <div className="charts-stack">
                {seriesList.map(({ kind, points }) => (
                  <ReadingChart
                    key={kind}
                    kind={kind}
                    points={points}
                    locale={settings.locale}
                    unitHint={getIndicatorMeta(kind).defaultUnit}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="card span-2">
            <h2 className="section-title">{t('home.todayReminders')}</h2>
            <DayAgenda
              items={todayItems}
              allEvents={events}
              dayIso={todayIso()}
              locale={settings.locale}
              t={t}
              onEdit={() => setTab('calendar')}
              onComplete={markComplete}
              emptyLabel={t('home.noReminders')}
              hideCharts
              enableShare
            />
          </section>
        </div>
      )}
    </>
  );
}
