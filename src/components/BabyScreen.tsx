import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CloudDrizzle,
  Droplet,
  Droplets,
  MessageCircleQuestion,
  Milk,
  Moon,
  Pencil,
  PersonStanding,
  Plus,
  Ruler,
  Undo2,
} from 'lucide-react';
import { buildCheckupEvent, missingCheckups } from '../core/baby/checkups';
import { formatBabyAge, formatCorrectedAge } from '../core/baby/age';
import {
  activeBaby,
  diaperCountsOnDay,
  eventsOnDay,
  feedCountOnDay,
  lastOfType,
  ongoingSleep,
  ongoingTummy,
  pumpCountOnDay,
  sleepDurationMs,
  sleepMinutesOnDay,
  sortLogsNewestFirst,
  tummyDurationMs,
} from '../core/baby/logs';
import { buildBabyRecsQuestion } from '../core/baby/recsPrompt';
import { diaperTitle, sleepTitle, spitupTitle, tummyTitle } from '../core/baby/titles';
import { localHm } from '../core/calendar/meta';
import { eventTypeIcon } from './eventIcons';
import { chartableSeries } from '../core/indicators/series';
import { getIndicatorMeta } from '../core/indicators/catalog';
import { laborToAttach } from '../core/labor/engine';
import { todayIso } from '../core/pregnancy/engine';
import { BabyLogSheet, type BabyLogMode } from './BabyLogSheet';
import { BabyProfileSheet } from './BabyProfileSheet';
import { BornBabyMascot } from './BornBabyMascot';
import { ReadingChart } from './ReadingChart';
import { BabySummaryCards } from './BabySummaryCards';
import { FoldCard } from './FoldCard';
import type { AppState } from '../hooks/useAppState';
import type { CalendarEvent, DiaperKind, SpitupAmount } from '../core/types';

type Props = { state: AppState; isHome?: boolean };

export function BabyScreen({ state, isHome: _isHome = false }: Props) {
  const {
    babies,
    settings,
    events,
    saveBaby,
    removeBaby,
    setActiveBabyId,
    saveEvent,
    removeEvent,
    laborSessions,
    saveLaborSession,
    setPendingAsk,
    setTab,
    t,
  } = state;
  const locale = settings.locale;
  const baby = activeBaby(babies, settings.activeBabyId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingBaby, setEditingBaby] = useState(false);
  const [logMode, setLogMode] = useState<BabyLogMode | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [, setSleepTick] = useState(0);
  const [checkupMsg, setCheckupMsg] = useState<string | null>(null);

  const today = todayIso();
  const sleeping = baby ? ongoingSleep(events, baby.id) : null;
  const tummying = baby ? ongoingTummy(events, baby.id) : null;

  useEffect(() => {
    if (!sleeping && !tummying) return;
    const id = window.setInterval(() => setSleepTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [sleeping, tummying]);

  const todayLogs = useMemo(() => {
    if (!baby) return [];
    return sortLogsNewestFirst(eventsOnDay(events, baby.id, today));
  }, [baby, events, today]);

  const charts = useMemo(() => {
    if (!baby) return [];
    return chartableSeries(events.filter((e) => e.babyId === baby.id)).filter(
      (s) =>
        s.kind === 'weight' ||
        s.kind === 'length' ||
        s.kind === 'head_circumference' ||
        s.kind === 'temperature'
    );
  }, [baby, events]);

  const logNow = (
    input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    saveEvent(input);
  };

  const quickDiaper = (kind: DiaperKind) => {
    if (!baby) return;
    const hm = localHm();
    const diaper = { kind };
    logNow({
      title: diaperTitle(diaper, locale),
      type: 'diaper',
      babyId: baby.id,
      startAt: today,
      timesOfDay: [hm],
      takenAt: `${today}T${hm}:00`,
      allDay: false,
      recurrence: 'none',
      diaper,
    });
  };

  const toggleSleep = () => {
    if (!baby) return;
    const hm = localHm();
    if (sleeping) {
      const endedAt = new Date().toISOString();
      const sleep = { endedAt, ongoing: false };
      saveEvent({
        id: sleeping.id,
        title: sleepTitle(sleep, locale, {
          ...sleeping,
          sleep,
          takenAt: sleeping.takenAt,
        }),
        type: 'sleep',
        babyId: baby.id,
        startAt: sleeping.startAt,
        endAt: endedAt.slice(0, 10),
        timesOfDay: sleeping.timesOfDay,
        takenAt: sleeping.takenAt,
        allDay: false,
        recurrence: 'none',
        notes: sleeping.notes,
        sleep,
      });
      return;
    }
    const sleep = { ongoing: true };
    logNow({
      title: sleepTitle(sleep, locale),
      type: 'sleep',
      babyId: baby.id,
      startAt: today,
      timesOfDay: [hm],
      takenAt: `${today}T${hm}:00`,
      allDay: false,
      recurrence: 'none',
      sleep,
    });
  };

  const toggleTummy = () => {
    if (!baby) return;
    const hm = localHm();
    if (tummying) {
      const endedAt = new Date().toISOString();
      const mins = Math.max(
        1,
        Math.round((tummyDurationMs(tummying) ?? 0) / 60_000)
      );
      const tummy = { endedAt, ongoing: false, durationMinutes: mins };
      saveEvent({
        id: tummying.id,
        title: tummyTitle(tummy, locale, {
          ...tummying,
          tummy,
          takenAt: tummying.takenAt,
        }),
        type: 'tummy',
        babyId: baby.id,
        startAt: tummying.startAt,
        endAt: endedAt.slice(0, 10),
        timesOfDay: tummying.timesOfDay,
        takenAt: tummying.takenAt,
        allDay: false,
        recurrence: 'none',
        notes: tummying.notes,
        tummy,
      });
      return;
    }
    const tummy = { ongoing: true };
    logNow({
      title: tummyTitle(tummy, locale),
      type: 'tummy',
      babyId: baby.id,
      startAt: today,
      timesOfDay: [hm],
      takenAt: `${today}T${hm}:00`,
      allDay: false,
      recurrence: 'none',
      tummy,
    });
  };

  const quickSpitup = (amount: SpitupAmount) => {
    if (!baby) return;
    const hm = localHm();
    const spitup = { amount };
    logNow({
      title: spitupTitle(spitup, locale),
      type: 'spitup',
      babyId: baby.id,
      startAt: today,
      timesOfDay: [hm],
      takenAt: `${today}T${hm}:00`,
      allDay: false,
      recurrence: 'none',
      spitup,
    });
  };

  const lastFeed = baby ? lastOfType(events, baby.id, 'feed') : null;
  const lastDiaper = baby ? lastOfType(events, baby.id, 'diaper') : null;
  const lastSleep = baby ? lastOfType(events, baby.id, 'sleep') : null;
  const feeds = baby ? feedCountOnDay(events, baby.id, today) : null;
  const pumps = baby ? pumpCountOnDay(events, baby.id, today) : null;
  const diapers = baby ? diaperCountsOnDay(events, baby.id, today) : null;
  const sleepMin = baby ? sleepMinutesOnDay(events, baby.id, today) : 0;
  const addCheckups = () => {
    if (!baby) return;
    const missing = missingCheckups(baby, events);
    if (!missing.length) {
      setCheckupMsg(t('baby.checkupsNone'));
      window.setTimeout(() => setCheckupMsg(null), 3500);
      return;
    }
    for (const template of missing) {
      saveEvent(buildCheckupEvent(baby, template, locale));
    }
    setCheckupMsg(t('baby.checkupsAdded', { n: missing.length }));
    window.setTimeout(() => setCheckupMsg(null), 3500);
  };

  const ago = (e: CalendarEvent | null) => {
    if (!e) return t('baby.noneYet');
    const ms = Date.now() - Date.parse(e.takenAt ?? e.createdAt);
    if (!Number.isFinite(ms) || ms < 0) return e.title;
    const min = Math.floor(ms / 60_000);
    if (min < 1) return t('baby.justNow');
    if (min < 60) return t('baby.minutesAgo', { n: min });
    const h = Math.floor(min / 60);
    return t('baby.hoursAgo', { n: h });
  };

  const askRecs = () => {
    if (!baby) return;
    setPendingAsk({
      question: buildBabyRecsQuestion(baby, locale),
      autoSubmit: true,
    });
    setTab('ask');
  };

  const undoLast = () => {
    if (!baby) return;
    const newest = sortLogsNewestFirst(
      events.filter((e) => e.babyId === baby.id)
    )[0];
    if (newest) removeEvent(newest.id);
  };

  return (
    <>
      <header className="page-heading">
        <h1>{t('baby.title')}</h1>
      </header>

      <div className="baby-switcher">
        <div
          className="baby-switcher-scroll"
          role="tablist"
          aria-label={t('baby.switchBaby')}
        >
          {babies.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={b.id === baby?.id}
              className={`baby-tab ${b.id === baby?.id ? 'is-active' : ''}`}
              onClick={() => setActiveBabyId(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="baby-add-btn"
          onClick={() => {
            setEditingBaby(false);
            setProfileOpen(true);
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          {t('baby.add')}
        </button>
      </div>

      {!baby ? (
        <section className="card">
          <p className="muted">{t('baby.empty')}</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 10 }}
            onClick={() => {
              setEditingBaby(false);
              setProfileOpen(true);
            }}
          >
            {t('baby.add')}
          </button>
        </section>
      ) : (
        <div className="layout-grid">
          <section className="hero-week span-2 baby-hero">
            <div className="hero-actions">
              <button
                type="button"
                className="hero-edit"
                aria-label={t('baby.edit')}
                title={t('baby.edit')}
                onClick={() => {
                  setEditingBaby(true);
                  setProfileOpen(true);
                }}
              >
                <Pencil size={16} strokeWidth={2.25} />
              </button>
            </div>
            {(settings.showBabyMascot ?? true) && (
              <BornBabyMascot
                baby={baby}
                events={events}
                t={t}
                sleeping={Boolean(sleeping)}
              />
            )}
            <div className="hero-week-inner">
            <div className="week-big">{baby.name}</div>
            <div className="hero-week-meta">
              <span>
                {t('baby.age')} · {formatBabyAge(baby.birthDate, locale)}
              </span>
            </div>
            {formatCorrectedAge(
              baby.birthDate,
              baby.gestationalWeeksAtBirth,
              locale
            ) ? (
              <p className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>
                {formatCorrectedAge(
                  baby.birthDate,
                  baby.gestationalWeeksAtBirth,
                  locale
                )}
              </p>
            ) : null}
            <div className="baby-last-strip">
              <div>
                <span className="muted">{t('baby.lastFeed')}</span>
                <strong>{ago(lastFeed)}</strong>
              </div>
              <div>
                <span className="muted">{t('baby.lastDiaper')}</span>
                <strong>{ago(lastDiaper)}</strong>
              </div>
              <div>
                <span className="muted">{t('baby.lastSleep')}</span>
                <strong>
                  {sleeping
                    ? t('baby.sleeping')
                    : ago(lastSleep)}
                </strong>
              </div>
            </div>
            <p className="muted baby-today-totals">
              {t('baby.feedsToday', { n: feeds?.count ?? 0 })}
              {pumps && pumps.count > 0
                ? ` · ${t('calendar.types.pump')} ${pumps.count}`
                : ''}
              {' · '}
              {t('baby.diapersToday', { n: diapers?.total ?? 0 })}
              {' · '}
              {t('baby.sleepToday', { n: sleepMin })}
            </p>
            </div>
          </section>

          {sleeping && (
            <section className="card span-2 baby-sleep-banner">
              <Moon size={18} />
              <div>
                <strong>{t('baby.sleeping')}</strong>
                <p className="muted">
                  {Math.round((sleepDurationMs(sleeping) ?? 0) / 60_000)}m
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={toggleSleep}>
                {t('baby.logSleepStop')}
              </button>
            </section>
          )}

          {tummying && (
            <section className="card span-2 baby-sleep-banner">
              <PersonStanding size={18} />
              <div>
                <strong>{t('baby.tummying')}</strong>
                <p className="muted">
                  {Math.round((tummyDurationMs(tummying) ?? 0) / 60_000)}m
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={toggleTummy}>
                {t('baby.logTummyStop')}
              </button>
            </section>
          )}

          <FoldCard
            foldId="baby-quick"
            title={t('calendar.quickLog')}
            t={t}
            className="card span-2 baby-quick-card"
          >
            <div className="quick-log-grid baby-quick">
              <button
                type="button"
                className="quick-log-btn is-feed"
                onClick={() => {
                  setEditEvent(null);
                  setLogMode('feed');
                }}
              >
                <span className="quick-log-icon is-feed" aria-hidden>
                  <Milk size={16} />
                </span>
                <span className="quick-log-label">{t('baby.logFeed')}</span>
              </button>
              <button
                type="button"
                className="quick-log-btn is-pump"
                onClick={() => {
                  setEditEvent(null);
                  setLogMode('pump');
                }}
              >
                <span className="quick-log-icon is-pump" aria-hidden>
                  <Droplet size={16} />
                </span>
                <span className="quick-log-label">{t('baby.logPump')}</span>
              </button>
              <button
                type="button"
                className="quick-log-btn is-sleep"
                onClick={toggleSleep}
              >
                <span className="quick-log-icon is-sleep" aria-hidden>
                  <Moon size={16} />
                </span>
                <span className="quick-log-label">
                  {sleeping ? t('baby.logSleepStop') : t('baby.logSleepStart')}
                </span>
              </button>
              <button
                type="button"
                className="quick-log-btn is-tummy"
                onClick={toggleTummy}
              >
                <span className="quick-log-icon is-tummy" aria-hidden>
                  <PersonStanding size={16} />
                </span>
                <span className="quick-log-label">
                  {tummying ? t('baby.logTummyStop') : t('baby.logTummyStart')}
                </span>
              </button>
              <button
                type="button"
                className="quick-log-btn is-indicator"
                onClick={() => {
                  setEditEvent(null);
                  setLogMode('indicator');
                }}
              >
                <span className="quick-log-icon is-indicator" aria-hidden>
                  <Ruler size={16} />
                </span>
                <span className="quick-log-label">{t('baby.logReading')}</span>
              </button>
            </div>

            <div className="baby-quick-actions">
              <div className="baby-quick-group">
                <span className="baby-quick-group-title">{t('baby.logDiaper')}</span>
                <div className="chip-row">
                  {(['wet', 'dirty', 'mixed'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="chip baby-action-chip"
                      onClick={() => quickDiaper(kind)}
                    >
                      <Droplets size={14} />
                      {kind === 'wet'
                        ? t('baby.diaperWet')
                        : kind === 'dirty'
                          ? t('baby.diaperDirty')
                          : t('baby.diaperMixed')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="baby-quick-group">
                <span className="baby-quick-group-title">{t('baby.logSpitup')}</span>
                <div className="chip-row">
                  {(['small', 'medium', 'large'] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="chip baby-action-chip"
                      onClick={() => quickSpitup(amount)}
                    >
                      <CloudDrizzle size={14} />
                      {amount === 'small'
                        ? t('baby.spitSmall')
                        : amount === 'medium'
                          ? t('baby.spitMedium')
                          : t('baby.spitLarge')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-block baby-undo-btn"
              onClick={undoLast}
            >
              <Undo2 size={16} />
              {t('baby.undo')}
            </button>
          </FoldCard>

          <BabySummaryCards
            baby={baby}
            events={events}
            t={t}
            locale={locale}
          />

          <div className="row-actions home-quick-actions span-2">
            <button type="button" className="btn btn-ghost" onClick={addCheckups}>
              <CalendarClock size={16} />
              {t('baby.checkupsAdd')}
            </button>
            <button type="button" className="btn btn-primary" onClick={askRecs}>
              <MessageCircleQuestion size={16} />
              {t('baby.recs')}
            </button>
          </div>
          {checkupMsg ? (
            <p className="muted span-2" role="status">
              {checkupMsg}
            </p>
          ) : (
            <p className="muted span-2" style={{ fontSize: '0.82rem', marginTop: '-0.35rem' }}>
              {t('baby.recsHint')}
            </p>
          )}

          {charts.length > 0 && (
            <FoldCard foldId="baby-charts" title={t('baby.chartsTitle')} t={t}>
              <div className="charts-stack">
                {charts.map(({ kind, points }) => (
                  <ReadingChart
                    key={kind}
                    kind={kind}
                    points={points}
                    locale={locale}
                    unitHint={getIndicatorMeta(kind).defaultUnit}
                    t={t}
                  />
                ))}
              </div>
            </FoldCard>
          )}

          <FoldCard foldId="baby-timeline" title={t('baby.timeline')} t={t}>
            {todayLogs.length === 0 ? (
              <p className="muted">{t('baby.timelineEmpty')}</p>
            ) : (
              <ul className="baby-timeline">
                {todayLogs.map((e) => {
                  const Icon = eventTypeIcon(e.type);
                  const clock =
                    e.timesOfDay?.[0] ||
                    (e.takenAt && e.takenAt.length >= 16
                      ? e.takenAt.slice(11, 16)
                      : '');
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="baby-timeline-row"
                        onClick={() => {
                          if (
                            e.type === 'feed' ||
                            e.type === 'diaper' ||
                            e.type === 'sleep' ||
                            e.type === 'pump' ||
                            e.type === 'tummy' ||
                            e.type === 'spitup' ||
                            e.type === 'indicator'
                          ) {
                            setEditEvent(e);
                            setLogMode(e.type as BabyLogMode);
                          }
                        }}
                      >
                        <span className={`quick-log-icon is-${e.type}`} aria-hidden>
                          <Icon size={16} />
                        </span>
                        <span className="baby-timeline-copy">
                          <strong>{e.title}</strong>
                          {clock ? <span className="muted">{clock}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </FoldCard>
        </div>
      )}

      {profileOpen && (
        <BabyProfileSheet
          t={t}
          locale={locale}
          editing={editingBaby ? baby : null}
          onClose={() => setProfileOpen(false)}
          onSave={(input) => {
            const saved = saveBaby(input);
            if (!editingBaby) {
              const labor = laborToAttach(laborSessions, saved.birthDate);
              if (labor) {
                saveLaborSession({
                  ...labor,
                  babyId: saved.id,
                  endedAt: labor.endedAt ?? new Date().toISOString(),
                });
              }
            }
            setProfileOpen(false);
          }}
          onDelete={
            editingBaby && baby
              ? (id) => {
                  removeBaby(id);
                  setProfileOpen(false);
                }
              : undefined
          }
        />
      )}

      {logMode && baby && (
        <BabyLogSheet
          t={t}
          locale={locale}
          babyId={baby.id}
          mode={logMode}
          defaultFeedMethod={baby.defaultFeedMethod}
          editing={editEvent}
          onClose={() => {
            setLogMode(null);
            setEditEvent(null);
          }}
          onSave={(input) => {
            saveEvent(input);
            setLogMode(null);
            setEditEvent(null);
          }}
          onDelete={
            editEvent
              ? (id) => {
                  removeEvent(id);
                  setLogMode(null);
                  setEditEvent(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
