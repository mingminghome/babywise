import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Baby,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  MessageCircleQuestion,
  Pencil,
  Timer,
} from 'lucide-react';
import { eventsForMother } from '../core/baby/logs';
import {
  laborToAttach,
  openLaborSession,
  shouldShowLaborOnHome,
} from '../core/labor/engine';
import { BabyProfileSheet } from './BabyProfileSheet';
import {
  dateInputHint,
  dueDateFromLmp,
  formatClinicalAge,
  formatIsoDate,
  formatWeekDay,
  lmpFromDueDate,
  previewGestationalAge,
  progressPercent,
  showClinicalSecondary,
  todayIso,
} from '../core/pregnancy/engine';
import type { GestationalAge, GestationalDisplayStyle, ProfileMethod } from '../core/types';
import { eventsForDate } from '../core/calendar/resolve';
import { getIndicatorMeta } from '../core/indicators/catalog';
import { chartableSeries } from '../core/indicators/series';
import { BabyFruitMascot } from './BabyFruitMascot';
import { DayAgenda } from './DayAgenda';
import { ReadingChart } from './ReadingChart';
import { StyledDateField } from './ui/StyledDateField';
import type { AppState } from '../hooks/useAppState';

export function PregnancyView({ state }: { state: AppState }) {
  const {
    profile,
    updateProfile,
    settings,
    t,
    ga,
    events,
    setTab,
    markComplete,
    laborSessions,
    babies,
    saveBaby,
    saveLaborSession,
    updateSettings,
  } = state;

  const motherEvents = useMemo(() => eventsForMother(events), [events]);
  const seriesList = useMemo(
    () => chartableSeries(motherEvents),
    [motherEvents]
  );
  const [babySheet, setBabySheet] = useState(false);
  const [babyConfirm, setBabyConfirm] = useState(false);
  const [editing, setEditing] = useState(!profile);
  const [method, setMethod] = useState<ProfileMethod>(profile?.method ?? 'lmp');
  const [dateValue, setDateValue] = useState(
    profile?.method === 'due_date' ? profile.dueDate ?? '' : profile?.lmpDate ?? ''
  );

  const todayItems = eventsForDate(
    motherEvents,
    todayIso(),
    profile
  );
  const openLabor = openLaborSession(laborSessions);
  const showLaborCard = shouldShowLaborOnHome({
    mode: settings.laborHomeMode,
    fromWeek: settings.laborHomeFromWeek,
    ga,
    hasOpenSession: Boolean(openLabor),
    hasProfile: Boolean(profile),
  });
  const locale = settings.locale;
  const displayStyle: GestationalDisplayStyle =
    settings.gestationalDisplay ?? 'weeks_days';

  const draftGa = useMemo(
    () => (editing ? previewGestationalAge(method, dateValue) : null),
    [editing, method, dateValue]
  );
  const draftHint = useMemo(
    () => (editing ? dateInputHint(method, dateValue) : 'empty'),
    [editing, method, dateValue]
  );

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
      lmpDate: method === 'lmp' ? dateValue : undefined,
      dueDate: method === 'due_date' ? dateValue : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    });
    setEditing(false);
  };

  const progress = progressPercent(ga);

  const ageLabel = (g: GestationalAge) => {
    if (g.totalDays < 0) return t('home.notPregnant');
    return formatWeekDay(g.weeks, g.days, locale, displayStyle);
  };

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
      {editing ? (
        <section className="card span-2 setup-dates-card">
          <h2 className="section-title">{t('home.setUpTitle')}</h2>
          <p className="muted" style={{ marginBottom: '1.25rem' }}>
            {t('home.setUpSubtitle')}
          </p>

          <div className="field-group">
            <div className="field-group-title">{t('home.setUpStep1')}</div>
            <div className="setup-method-grid home-mode-grid" role="radiogroup" aria-label={t('home.setUpStep1')}>
              <button
                type="button"
                className={`home-mode-card ${method === 'lmp' ? 'is-active' : ''}`}
                onClick={() => selectMethod('lmp')}
              >
                <span className="home-mode-icon">
                  <CalendarHeart size={20} />
                </span>
                <div className="home-mode-info">
                  <span className="home-mode-name">{t('home.methodLmp')}</span>
                  <span className="home-mode-desc">{t('home.methodLmpDesc')}</span>
                </div>
              </button>
              <button
                type="button"
                className={`home-mode-card ${method === 'due_date' ? 'is-active' : ''}`}
                onClick={() => selectMethod('due_date')}
              >
                <span className="home-mode-icon">
                  <CalendarDays size={20} />
                </span>
                <div className="home-mode-info">
                  <span className="home-mode-name">{t('home.methodDue')}</span>
                  <span className="home-mode-desc">{t('home.methodDueDesc')}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="field-group">
            <div className="field-group-title">{t('home.setUpStep2')}</div>
            <StyledDateField
              id="preg-date"
              label={method === 'lmp' ? t('home.lmp') : t('home.dueDate')}
              value={dateValue}
              onChange={setDateValue}
            />
          </div>

          {draftGa && (
            <div className="setup-preview" aria-live="polite">
              <div className="setup-preview-label">{t('home.previewTitle')}</div>
              <div className="setup-preview-week">
                <span className="setup-preview-week-main">{ageLabel(draftGa)}</span>
                {draftGa.totalDays >= 0 && showClinicalSecondary(displayStyle) && (
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
          {profile && ga ? (
            <section className="hero-week span-2">
              <div className="hero-actions">
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
                <button
                  type="button"
                  className="hero-edit"
                  aria-label={t('home.babyArrived')}
                  title={t('home.babyArrived')}
                  onClick={() => setBabyConfirm(true)}
                >
                  <Baby size={16} strokeWidth={2.25} />
                </button>
              </div>
              <div className="hero-week-inner">
                {ga.totalDays >= 0 && (settings.showMascot ?? true) && (
                  <BabyFruitMascot week={ga.weeks} t={t} />
                )}
                <div className="week-big">{ageLabel(ga)}</div>
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
          ) : (
            <section className="card span-2">
              <h2 className="section-title">{t('home.setUpTitle')}</h2>
              <p className="muted" style={{ marginBottom: 12 }}>
                {t('home.setUpSubtitle')}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setEditing(true)}
              >
                {t('home.setUpDates')}
              </button>
            </section>
          )}

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

          {showLaborCard && (
            <section className="card span-2">
              <h2 className="section-title">{t('labor.title')}</h2>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
                {t('home.laborHint')}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setTab('tools')}
              >
                <Timer size={16} />
                {openLabor ? t('home.laborResume') : t('home.laborOpen')}
              </button>
            </section>
          )}

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
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="card span-2">
            <h2 className="section-title">{t('home.todayReminders')}</h2>
            <DayAgenda
              items={todayItems}
              allEvents={motherEvents}
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

      {babyConfirm &&
        createPortal(
          <div
            className="sheet-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setBabyConfirm(false);
            }}
          >
            <div className="sheet" role="dialog" aria-modal="true">
              <div className="sheet-handle" />
              <h2 className="sheet-title">{t('home.babyArrivedConfirmTitle')}</h2>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                {t('home.babyArrivedConfirmBody')}
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setBabyConfirm(false)}
                >
                  {t('calendar.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setBabyConfirm(false);
                    if (babies.length > 0) {
                      updateSettings({
                        ...settings,
                        homeMode: 'baby',
                        babyCareEnabled: true,
                      });
                      setTab('home');
                    } else {
                      setBabySheet(true);
                    }
                  }}
                >
                  {t('home.babyArrivedConfirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {babySheet && (
        <BabyProfileSheet
          t={t}
          locale={locale}
          fromPregnancy={Boolean(profile)}
          onClose={() => setBabySheet(false)}
          onSave={(input) => {
            const saved = saveBaby(input);
            const labor = laborToAttach(laborSessions, saved.birthDate);
            if (labor) {
              saveLaborSession({
                ...labor,
                babyId: saved.id,
                endedAt: labor.endedAt ?? new Date().toISOString(),
              });
            }
            updateSettings({
              ...settings,
              homeMode: 'baby',
              babyCareEnabled: true,
            });
            setBabySheet(false);
            setTab('home');
          }}
        />
      )}
    </>
  );
}
