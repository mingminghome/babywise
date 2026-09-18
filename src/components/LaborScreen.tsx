import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Play, Share2, Square, Timer, Undo2 } from 'lucide-react';
import {
  contractionDurationSec,
  contractionIntervalSec,
  evaluateLaborRule,
  formatIntervalLabel,
  formatLaborSessionText,
  formatMmSs,
  ongoingContraction,
  openLaborSession,
} from '../core/labor/engine';
import { showLocalNotification } from '../core/notifications/local';
import { shareOrCopyText } from '../core/util/share';
import { FoldCard } from './FoldCard';
import type { AppState } from '../hooks/useAppState';
import type { Contraction, LaborSession } from '../core/types';

type Props = { state: AppState };

export function LaborScreen({ state }: Props) {
  const {
    laborSessions,
    saveLaborSession,
    removeLaborSession,
    laborRule,
    settings,
    t,
  } = state;
  const [shareInfo, setShareInfo] = useState<string | null>(null);
  const zh = settings.locale === 'zh-Hant';
  const [tick, setTick] = useState(0);
  const wakeRef = useRef<{ release: () => void } | null>(null);

  const session = openLaborSession(laborSessions);
  const wave = ongoingContraction(session);
  const completed = useMemo(() => {
    if (!session) return [] as Contraction[];
    return session.contractions
      .filter((c) => c.endAt)
      .toSorted((a, b) => b.startAt.localeCompare(a.startAt));
  }, [session]);

  const pattern = evaluateLaborRule(
    session?.contractions ?? [],
    laborRule.rule,
    new Date()
  );

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session || session.endedAt) {
      void wakeRef.current?.release();
      wakeRef.current = null;
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    let released = false;
    const acquire = async () => {
      try {
        const sentinel = await nav.wakeLock?.request('screen');
        if (!sentinel || released) {
          await sentinel?.release();
          return;
        }
        wakeRef.current = {
          release: () => {
            void sentinel.release();
          },
        };
      } catch {
        /* unsupported / denied */
      }
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVis);
      void wakeRef.current?.release();
      wakeRef.current = null;
    };
  }, [session?.id, session?.endedAt]);

  useEffect(() => {
    if (!session || session.notifiedRuleMet) return;
    if (pattern.status !== 'met') return;
    if (!settings.notificationsEnabled) return;
    void showLocalNotification(
      t('notify.laborMetTitle'),
      t('notify.laborMetBody'),
      { tag: `babywise-labor-${session.id}` }
    );
    saveLaborSession({ ...session, notifiedRuleMet: true });
  }, [
    pattern.status,
    session,
    settings.notificationsEnabled,
    saveLaborSession,
    t,
  ]);

  const ruleLabel =
    laborRule.preset === '511'
      ? t('labor.rule511')
      : laborRule.preset === '411'
        ? t('labor.rule411')
        : t('labor.ruleCustom', {
            interval: laborRule.rule.intervalMinutes,
            duration: laborRule.rule.durationMinutes,
            sustained: laborRule.rule.sustainedMinutes,
          });


  const endSession = () => {
    if (!session) return;
    const open = ongoingContraction(session);
    const contractions = open
      ? session.contractions.map((c) =>
          c.id === open.id ? { ...c, endAt: new Date().toISOString() } : c
        )
      : session.contractions;
    saveLaborSession({
      ...session,
      contractions,
      endedAt: new Date().toISOString(),
    });
  };

  const tapWave = () => {
    const now = new Date().toISOString();
    if (!session) {
      const first: Contraction = { id: crypto.randomUUID(), startAt: now };
      saveLaborSession({
        startedAt: now,
        contractions: [first],
        rulePreset: laborRule.preset,
        rule: laborRule.rule,
      });
      return;
    }
    if (wave) {
      saveLaborSession({
        ...session,
        contractions: session.contractions.map((c) =>
          c.id === wave.id ? { ...c, endAt: now } : c
        ),
      });
      return;
    }
    const next: Contraction = {
      id: crypto.randomUUID(),
      startAt: now,
    };
    saveLaborSession({
      ...session,
      contractions: [...session.contractions, next],
    });
  };

  const undoLast = () => {
    if (!session || !session.contractions.length) return;
    const last = [...session.contractions].toSorted((a, b) =>
      b.startAt.localeCompare(a.startAt)
    )[0];
    if (!last) return;
    saveLaborSession({
      ...session,
      contractions: session.contractions.filter((c) => c.id !== last.id),
    });
  };

  const shareSession = async (s: LaborSession) => {
    const text = formatLaborSessionText(s, { zh });
    const res = await shareOrCopyText({
      title: zh ? 'BabyWise 宮縮' : 'BabyWise labor',
      text,
    });
    if (res.ok) {
      setShareInfo(
        res.via === 'share' ? t('calendar.shareOpened') : t('calendar.shareCopied')
      );
    } else if (res.reason !== 'cancelled') {
      setShareInfo(t('calendar.shareFailed'));
    }
    window.setTimeout(() => setShareInfo(null), 3500);
  };

  const setIntensity = (id: string, intensity: number) => {
    if (!session) return;
    saveLaborSession({
      ...session,
      contractions: session.contractions.map((c) =>
        c.id === id ? { ...c, intensity } : c
      ),
    });
  };

  const restSec =
    !wave && completed[0]
      ? Math.round(
          (Date.now() - Date.parse(completed[0].endAt ?? completed[0].startAt)) /
            1000
        )
      : 0;
  const elapsedSec = wave
    ? contractionDurationSec(wave, Date.now()) ?? 0
    : restSec;
  const phase = wave ? 'on' : session && completed.length > 0 ? 'rest' : 'idle';
  const hitLabel =
    phase === 'on'
      ? t('labor.tapStop')
      : phase === 'rest'
        ? t('labor.tapNext')
        : t('labor.tapStart');
  const phaseLabel =
    phase === 'on'
      ? t('labor.phaseOn')
      : phase === 'rest'
        ? t('labor.phaseRest')
        : t('labor.phaseIdle');

  const statusText =
    pattern.status === 'met'
      ? t('labor.statusMet')
      : pattern.status === 'approaching'
        ? t('labor.statusApproaching')
        : pattern.status === 'tracking'
          ? t('labor.statusTracking')
          : t('labor.statusIdle');

  const past = laborSessions
    .filter((s) => s.endedAt)
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt));

  void tick;

  return (
    <div className="layout-grid labor-page">
      <header className="page-heading span-2">
        <h1>{t('labor.title')}</h1>
        <p className="subtitle">
          {t('labor.subtitle', { rule: ruleLabel })}
        </p>
      </header>

      <section className="card span-2 labor-timer-card">
        <div className={`labor-status is-${pattern.status}`}>
          <span className="labor-status-dot" aria-hidden />
          <span className="labor-status-text">{statusText}</span>
        </div>
        <button
          type="button"
          className={`labor-hit is-${phase}`}
          onClick={tapWave}
        >
          <span className="labor-hit-phase">
            <Timer size={13} />
            {phaseLabel}
          </span>
          <span className="labor-hit-clock">{formatMmSs(elapsedSec)}</span>
          <span className="labor-hit-btn-pill">
            {phase === 'on' ? (
              <Square size={12} fill="currentColor" />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
            <span>{hitLabel}</span>
          </span>
        </button>
        <div className="labor-stats">
          <div className="labor-stat-item">
            <span className="muted">{t('labor.contraction')}</span>
            <strong>{pattern.completedCount}</strong>
          </div>
          <div className="labor-stat-item">
            <span className="muted">{t('labor.avgDuration')}</span>
            <strong>
              {pattern.avgDurationSec != null
                ? formatMmSs(pattern.avgDurationSec)
                : '—'}
            </strong>
          </div>
          <div className="labor-stat-item">
            <span className="muted">{t('labor.avgInterval')}</span>
            <strong>
              {pattern.avgIntervalSec != null
                ? formatIntervalLabel(pattern.avgIntervalSec, zh)
                : '—'}
            </strong>
          </div>
        </div>
        {session && (
          <div className="labor-actions">
            <button
              type="button"
              className="labor-action-btn is-undo"
              onClick={undoLast}
              title={t('labor.undo')}
            >
              <Undo2 size={15} />
              <span>{t('labor.undo')}</span>
            </button>
            <button
              type="button"
              className="labor-action-btn is-share"
              onClick={() => void shareSession(session)}
              title={t('labor.shareSession')}
            >
              <Share2 size={15} />
              <span>{t('labor.shareSession')}</span>
            </button>
            <button
              type="button"
              className="labor-action-btn is-end"
              onClick={endSession}
              title={t('labor.endSession')}
            >
              <Square size={13} fill="currentColor" />
              <span>{t('labor.endSession')}</span>
            </button>
          </div>
        )}
        {session && !session.endedAt ? (
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
            {t('labor.keepAwake')}
          </p>
        ) : null}
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          {t('labor.disclaimer')}
        </p>
        {shareInfo ? (
          <p className="muted" style={{ marginTop: 8 }} role="status">
            {shareInfo}
          </p>
        ) : null}
      </section>

      {session && completed.length > 0 && (
        <FoldCard foldId="labor-waves" title={t('labor.contraction')} t={t}>
          <ul className="labor-wave-list">
            {completed.map((c, i, arr) => {
              const dur = contractionDurationSec(c) ?? 0;
              const older = arr[i + 1];
              const interval = older
                ? contractionIntervalSec(older, c)
                : null;
              return (
                <li key={c.id} className="labor-wave-row">
                  <div>
                    <strong>{formatMmSs(dur)}</strong>
                    <span className="muted">
                      {new Date(c.startAt).toLocaleTimeString(
                        zh ? 'zh-Hant' : 'en',
                        { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                      )}
                      {interval != null
                        ? ` · ${formatIntervalLabel(interval, zh)}`
                        : ''}
                    </span>
                  </div>
                  <div className="intensity-picker" role="group" aria-label={t('labor.intensity')}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`intensity-dot is-level-${n} ${c.intensity === n ? 'active' : ''}`}
                        onClick={() => setIntensity(c.id, n)}
                        aria-label={`${t('labor.intensity')} ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </FoldCard>
      )}

      <FoldCard foldId="labor-history" title={t('labor.history')} t={t}>
        {past.length === 0 ? (
          <p className="muted">{t('labor.historyEmpty')}</p>
        ) : (
          <ul className="labor-history">
            {past.map((s) => (
              <HistoryRow
                key={s.id}
                session={s}
                zh={zh}
                t={t}
                onDelete={() => removeLaborSession(s.id)}
                onShare={() => void shareSession(s)}
              />
            ))}
          </ul>
        )}
      </FoldCard>
    </div>
  );
}

function HistoryRow({
  session,
  zh,
  t,
  onDelete,
  onShare,
}: {
  session: LaborSession;
  zh: boolean;
  t: AppState['t'];
  onDelete: () => void;
  onShare: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const completed = useMemo(() => {
    return session.contractions
      .filter((c) => c.endAt)
      .toSorted((a, b) => a.startAt.localeCompare(b.startAt));
  }, [session.contractions]);

  const durations = completed
    .map((c) => contractionDurationSec(c))
    .filter((n): n is number => n != null);
  const avgDur = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const intervals: number[] = [];
  for (let i = 1; i < completed.length; i++) {
    const iv = contractionIntervalSec(completed[i - 1], completed[i]);
    if (iv != null) intervals.push(iv);
  }
  const avgInterval = intervals.length
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : null;

  const startMs = Date.parse(session.startedAt);
  const endMs = session.endedAt
    ? Date.parse(session.endedAt)
    : completed.length && completed[completed.length - 1].endAt
      ? Date.parse(completed[completed.length - 1].endAt!)
      : null;
  const totalSessionSec =
    endMs && !isNaN(endMs) && !isNaN(startMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 1000)
      : null;

  const when = new Date(session.startedAt).toLocaleString(zh ? 'zh-Hant' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayWaves = useMemo(() => completed.toReversed(), [completed]);

  return (
    <li className={`labor-history-row ${expanded ? 'is-expanded' : ''}`}>
      <div
        className="labor-history-summary"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="labor-history-meta">
          <div className="labor-history-time-row">
            <strong className="labor-history-date">{when}</strong>
            {totalSessionSec != null && (
              <span className="labor-history-duration-tag">
                {t('labor.totalDuration')}: {formatIntervalLabel(totalSessionSec, zh)}
              </span>
            )}
          </div>
          <div className="labor-history-badges">
            <span className="labor-badge">
              {t('labor.waves', { n: completed.length })}
            </span>
            {avgDur != null && (
              <span className="labor-badge">
                {t('labor.avgDuration')} {formatMmSs(avgDur)}
              </span>
            )}
            {avgInterval != null && (
              <span className="labor-badge">
                {t('labor.avgInterval')} {formatIntervalLabel(avgInterval, zh)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-xs labor-history-toggle-btn"
          aria-label={expanded ? t('labor.hideDetails') : t('labor.viewDetails')}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="labor-history-details">
          {displayWaves.length > 0 ? (
            <div className="labor-history-waves">
              <div className="labor-history-table-head">
                <span>#</span>
                <span>{t('labor.contraction')}</span>
                <span>{t('labor.frequency')}</span>
                <span>{t('labor.intensity')}</span>
              </div>
              <ul className="labor-history-wave-list">
                {displayWaves.map((c, idx) => {
                  const waveNumber = displayWaves.length - idx;
                  const dur = contractionDurationSec(c) ?? 0;
                  const cIndex = completed.indexOf(c);
                  const prev = cIndex > 0 ? completed[cIndex - 1] : null;
                  const interval = prev ? contractionIntervalSec(prev, c) : null;
                  const clock = new Date(c.startAt).toLocaleTimeString(
                    zh ? 'zh-Hant' : 'en',
                    { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                  );

                  return (
                    <li key={c.id} className="labor-history-wave-item">
                      <span className="wave-idx">#{waveNumber}</span>
                      <div className="wave-time-dur">
                        <strong>{formatMmSs(dur)}</strong>
                        <span className="muted">{clock}</span>
                      </div>
                      <span className="wave-interval">
                        {interval != null ? formatIntervalLabel(interval, zh) : '—'}
                      </span>
                      <div className="wave-intensity">
                        {c.intensity ? (
                          <div
                            className="intensity-dots-mini"
                            title={`${t('labor.intensity')} ${c.intensity}`}
                          >
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <span
                                key={lvl}
                                className={`mini-dot is-level-${lvl} ${
                                  c.intensity! >= lvl ? 'filled' : ''
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0.4rem 0' }}>
              {t('labor.historyEmpty')}
            </p>
          )}

          <div className="labor-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="labor-action-btn is-share"
              onClick={onShare}
            >
              <Share2 size={15} />
              <span>{t('labor.shareSession')}</span>
            </button>
            <button
              type="button"
              className="labor-action-btn is-end"
              onClick={onDelete}
            >
              <span>{t('labor.deleteSession')}</span>
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
