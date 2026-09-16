import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { localHm } from '../core/calendar/meta';
import { getIndicatorMeta, indicatorLabel } from '../core/indicators/catalog';
import { formatIndicatorDisplay } from '../core/indicators/catalog';
import { todayIso } from '../core/pregnancy/engine';
import {
  diaperTitle,
  feedTitle,
  pumpTitle,
  sleepTitle,
  spitupTitle,
  tummyTitle,
} from '../core/baby/titles';
import { BABY_READING_KINDS, sleepDurationMs, tummyDurationMs } from '../core/baby/logs';
import { StyledDateField } from './ui/StyledDateField';
import { StyledSelect } from './ui/StyledSelect';
import { X } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type {
  CalendarEvent,
  DiaperKind,
  FeedMethod,
  FeedSide,
  IndicatorKind,
  Locale,
  SpitupAmount,
} from '../core/types';

export type BabyLogMode =
  | 'feed'
  | 'diaper'
  | 'sleep'
  | 'indicator'
  | 'pump'
  | 'tummy'
  | 'spitup';

type Props = {
  t: TFunction;
  locale: Locale;
  babyId: string;
  mode: BabyLogMode;
  defaultFeedMethod?: FeedMethod;
  editing?: CalendarEvent | null;
  onClose: () => void;
  onSave: (
    input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => void;
  onDelete?: (id: string) => void;
};

const FEED_METHODS: FeedMethod[] = ['breast', 'bottle', 'formula'];
const SIDES: FeedSide[] = ['left', 'right', 'both'];
const DIAPERS: DiaperKind[] = ['wet', 'dirty', 'mixed', 'dry'];
const SPITUPS: SpitupAmount[] = ['small', 'medium', 'large'];

function dayAndTime(e?: CalendarEvent | null): { day: string; hm: string } {
  const day = e?.startAt?.slice(0, 10) || todayIso();
  const hm =
    e?.timesOfDay?.[0] ||
    (e?.takenAt && e.takenAt.length >= 16 ? e.takenAt.slice(11, 16) : '') ||
    localHm();
  return { day, hm };
}

export function BabyLogSheet({
  t,
  locale,
  babyId,
  mode,
  defaultFeedMethod,
  editing,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const initial = dayAndTime(editing);
  const [day, setDay] = useState(initial.day);
  const [hm, setHm] = useState(initial.hm);
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const [method, setMethod] = useState<FeedMethod>(() => {
    if (editing?.feed?.method) return editing.feed.method;
    if (defaultFeedMethod) return defaultFeedMethod;
    const stored =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('bw_pref_feed_method')
        : null;
    if (stored === 'breast' || stored === 'bottle' || stored === 'formula') {
      return stored;
    }
    return 'breast';
  });

  const handleSelectMethod = (next: FeedMethod) => {
    setMethod(next);
    try {
      localStorage.setItem('bw_pref_feed_method', next);
    } catch {
      // ignore
    }
  };

  const handleAddDuration = (inc: number) => {
    const cur = Number(duration) || 0;
    setDuration(String(Math.max(0, cur + inc)));
  };

  const handleAddAmount = (inc: number) => {
    const cur = Number(amount) || 0;
    setAmount(String(Math.max(0, cur + inc)));
  };

  const [side, setSide] = useState<FeedSide>(
    editing?.feed?.side ?? editing?.pump?.side ?? 'left'
  );
  const [duration, setDuration] = useState(
    editing?.feed?.durationMinutes != null
      ? String(editing.feed.durationMinutes)
      : editing?.pump?.durationMinutes != null
        ? String(editing.pump.durationMinutes)
        : editing?.tummy?.durationMinutes != null
          ? String(editing.tummy.durationMinutes)
          : ''
  );
  const [amount, setAmount] = useState(
    editing?.feed?.amountMl != null
      ? String(editing.feed.amountMl)
      : editing?.pump?.amountMl != null
        ? String(editing.pump.amountMl)
        : ''
  );
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  const [diaperKind, setDiaperKind] = useState<DiaperKind>(
    editing?.diaper?.kind ?? 'wet'
  );
  const [spitAmount, setSpitAmount] = useState<SpitupAmount>(
    editing?.spitup?.amount ?? 'small'
  );

  const [kind, setKind] = useState<IndicatorKind>(
    editing?.indicator?.kind &&
      (BABY_READING_KINDS as readonly string[]).includes(editing.indicator.kind)
      ? editing.indicator.kind
      : 'weight'
  );
  const [value, setValue] = useState(
    editing?.indicator != null ? String(editing.indicator.value) : ''
  );
  const [unit, setUnit] = useState(
    editing?.indicator?.unit ?? getIndicatorMeta(kind).defaultUnit
  );

  useEffect(() => {
    if (timerStart == null) return;
    const id = window.setInterval(() => setTimerTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [timerStart]);

  const elapsedSec =
    timerStart == null
      ? 0
      : Math.max(0, Math.round((Date.now() - timerStart) / 1000));
  void timerTick;

  const handleSave = () => {
    const stamp = {
      babyId,
      startAt: day,
      timesOfDay: hm ? [hm] : undefined,
      takenAt: hm ? `${day}T${hm}:00` : new Date().toISOString(),
      allDay: !hm,
      recurrence: 'none' as const,
      notes: notes.trim() || undefined,
    };

    if (mode === 'feed') {
      try {
        localStorage.setItem('bw_pref_feed_method', method);
      } catch {
        // ignore
      }
      const durNum = duration !== '' ? Number(duration) : undefined;
      const amtNum = amount !== '' ? Number(amount) : undefined;
      const feed = {
        method,
        side: method === 'breast' ? side : undefined,
        durationMinutes:
          durNum != null && Number.isFinite(durNum) ? durNum : undefined,
        amountMl: amtNum != null && Number.isFinite(amtNum) ? amtNum : undefined,
      };
      onSave({
        id: editing?.id,
        type: 'feed',
        title: feedTitle(feed, locale),
        feed,
        ...stamp,
      });
      return;
    }

    if (mode === 'pump') {
      const durNum = duration !== '' ? Number(duration) : undefined;
      const amtNum = amount !== '' ? Number(amount) : undefined;
      const pump = {
        side,
        durationMinutes:
          durNum != null && Number.isFinite(durNum) ? durNum : undefined,
        amountMl: amtNum != null && Number.isFinite(amtNum) ? amtNum : undefined,
      };
      onSave({
        id: editing?.id,
        type: 'pump',
        title: pumpTitle(pump, locale),
        pump,
        ...stamp,
      });
      return;
    }

    if (mode === 'tummy') {
      const durNum = duration !== '' ? Number(duration) : undefined;
      const tummy = {
        durationMinutes:
          durNum != null && Number.isFinite(durNum) ? durNum : undefined,
        endedAt: editing?.tummy?.endedAt,
        ongoing: editing?.tummy?.ongoing ?? false,
      };
      const draft: CalendarEvent = {
        id: editing?.id ?? 'tmp',
        type: 'tummy',
        title: '',
        babyId,
        startAt: day,
        takenAt: stamp.takenAt,
        tummy,
        createdAt: editing?.createdAt ?? stamp.takenAt,
        updatedAt: stamp.takenAt,
      };
      onSave({
        id: editing?.id,
        type: 'tummy',
        title: tummyTitle(tummy, locale, draft),
        tummy,
        ...stamp,
      });
      return;
    }

    if (mode === 'spitup') {
      const spitup = { amount: spitAmount };
      onSave({
        id: editing?.id,
        type: 'spitup',
        title: spitupTitle(spitup, locale),
        spitup,
        ...stamp,
      });
      return;
    }

    if (mode === 'diaper') {
      const diaper = { kind: diaperKind };
      onSave({
        id: editing?.id,
        type: 'diaper',
        title: diaperTitle(diaper, locale),
        diaper,
        ...stamp,
      });
      return;
    }

    if (mode === 'sleep') {
      const endedAt = editing?.sleep?.endedAt;
      const ongoing = editing?.sleep?.ongoing ?? false;
      const sleep = { endedAt, ongoing };
      const draft: CalendarEvent = {
        id: editing?.id ?? 'tmp',
        type: 'sleep',
        title: '',
        babyId,
        startAt: day,
        timesOfDay: hm ? [hm] : undefined,
        takenAt: stamp.takenAt,
        sleep,
        createdAt: editing?.createdAt ?? stamp.takenAt,
        updatedAt: stamp.takenAt,
      };
      onSave({
        id: editing?.id,
        type: 'sleep',
        title: sleepTitle(sleep, locale, draft),
        sleep,
        endAt: endedAt ? endedAt.slice(0, 10) : undefined,
        ...stamp,
      });
      return;
    }

    const num = Number(value);
    if (value === '' || Number.isNaN(num)) return;
    const indicator = { kind, value: num, unit: unit.trim() };
    onSave({
      id: editing?.id,
      type: 'indicator',
      title: formatIndicatorDisplay(kind, num, unit.trim(), locale),
      indicator,
      ...stamp,
    });
  };

  const canSave = mode !== 'indicator' || (value !== '' && !Number.isNaN(Number(value)));

  return createPortal(
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-header-copy">
            <h2 className="sheet-title">
              {editing ? t('calendar.edit') : t(`calendar.types.${mode}`)}
            </h2>
            <p className="sheet-subtitle">
              {t(`calendar.types.${mode}`)}
            </p>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            aria-label={t('calendar.cancel')}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="field-group">
          <div className="field-group-title">{t(`calendar.types.${mode}`)}</div>
          {mode === 'feed' && (
          <>
            <div className="field">
              <label>{t('baby.method')}</label>
              <div className="chip-row">
                {FEED_METHODS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${method === id ? 'active' : ''}`}
                    onClick={() => handleSelectMethod(id)}
                  >
                    {id === 'breast'
                      ? t('baby.methodBreast')
                      : id === 'bottle'
                        ? t('baby.methodBottle')
                        : t('baby.methodFormula')}
                  </button>
                ))}
              </div>
            </div>
            {method === 'breast' && (
              <div className="field">
                <label>{t('baby.side')}</label>
                <div className="chip-row">
                  {SIDES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`chip ${side === id ? 'active' : ''}`}
                      onClick={() => setSide(id)}
                    >
                      {id === 'left'
                        ? t('baby.sideLeft')
                        : id === 'right'
                          ? t('baby.sideRight')
                          : t('baby.sideBoth')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field">
              <label>{t('baby.duration')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <div className="quick-chips-row" style={{ marginTop: 6 }}>
                {[5, 10, 15, 20, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`quick-chip ${Number(duration) === m ? 'is-selected' : ''}`}
                    onClick={() => setDuration(String(m))}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddDuration(5)}
                >
                  +5m
                </button>
              </div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                {timerStart == null ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setTimerStart(Date.now())}
                  >
                    {t('baby.startTimer')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setDuration(
                        String(Math.max(1, Math.round(elapsedSec / 60)))
                      );
                      setTimerStart(null);
                    }}
                  >
                    {t('baby.stopTimer')} · {Math.floor(elapsedSec / 60)}:
                    {String(elapsedSec % 60).padStart(2, '0')}
                  </button>
                )}
              </div>
            </div>
            {method !== 'breast' && (
              <div className="field">
                <label>{t('baby.amount')}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="quick-chips-row" style={{ marginTop: 6 }}>
                  {[60, 90, 120, 150, 180, 210, 240].map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      className={`quick-chip ${Number(amount) === ml ? 'is-selected' : ''}`}
                      onClick={() => setAmount(String(ml))}
                    >
                      {ml}ml
                    </button>
                  ))}
                  <button
                    type="button"
                    className="quick-chip quick-chip--inc"
                    onClick={() => handleAddAmount(10)}
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    className="quick-chip quick-chip--inc"
                    onClick={() => handleAddAmount(30)}
                  >
                    +30
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'pump' && (
          <>
            <div className="field">
              <label>{t('baby.side')}</label>
              <div className="chip-row">
                {SIDES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${side === id ? 'active' : ''}`}
                    onClick={() => setSide(id)}
                  >
                    {id === 'left'
                      ? t('baby.sideLeft')
                      : id === 'right'
                        ? t('baby.sideRight')
                        : t('baby.sideBoth')}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>{t('baby.duration')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <div className="quick-chips-row" style={{ marginTop: 6 }}>
                {[10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`quick-chip ${Number(duration) === m ? 'is-selected' : ''}`}
                    onClick={() => setDuration(String(m))}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddDuration(5)}
                >
                  +5m
                </button>
              </div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                {timerStart == null ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setTimerStart(Date.now())}
                  >
                    {t('baby.startTimer')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setDuration(
                        String(Math.max(1, Math.round(elapsedSec / 60)))
                      );
                      setTimerStart(null);
                    }}
                  >
                    {t('baby.stopTimer')} · {Math.floor(elapsedSec / 60)}:
                    {String(elapsedSec % 60).padStart(2, '0')}
                  </button>
                )}
              </div>
            </div>
            <div className="field">
              <label>{t('baby.amount')}</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="quick-chips-row" style={{ marginTop: 6 }}>
                {[30, 60, 90, 120, 150, 180].map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    className={`quick-chip ${Number(amount) === ml ? 'is-selected' : ''}`}
                    onClick={() => setAmount(String(ml))}
                  >
                    {ml}ml
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddAmount(10)}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddAmount(30)}
                >
                  +30
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'tummy' && (
          <>
            {editing?.tummy?.ongoing ? (
              <p className="muted" style={{ marginBottom: '0.75rem' }}>
                {t('baby.tummying')}
                {tummyDurationMs(editing) != null
                  ? ` · ${Math.round((tummyDurationMs(editing) ?? 0) / 60_000)}m`
                  : ''}
              </p>
            ) : null}
            <div className="field">
              <label>{t('baby.duration')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <div className="quick-chips-row" style={{ marginTop: 6 }}>
                {[3, 5, 10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`quick-chip ${Number(duration) === m ? 'is-selected' : ''}`}
                    onClick={() => setDuration(String(m))}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddDuration(2)}
                >
                  +2m
                </button>
                <button
                  type="button"
                  className="quick-chip quick-chip--inc"
                  onClick={() => handleAddDuration(5)}
                >
                  +5m
                </button>
              </div>
              <div className="row-actions" style={{ marginTop: 8 }}>
                {timerStart == null ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setTimerStart(Date.now())}
                  >
                    {t('baby.startTimer')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setDuration(
                        String(Math.max(1, Math.round(elapsedSec / 60)))
                      );
                      setTimerStart(null);
                    }}
                  >
                    {t('baby.stopTimer')} · {Math.floor(elapsedSec / 60)}:
                    {String(elapsedSec % 60).padStart(2, '0')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {mode === 'spitup' && (
          <div className="field">
            <label>{t('baby.logSpitup')}</label>
            <div className="chip-row">
              {SPITUPS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${spitAmount === id ? 'active' : ''}`}
                  onClick={() => setSpitAmount(id)}
                >
                  {id === 'small'
                    ? t('baby.spitSmall')
                    : id === 'medium'
                      ? t('baby.spitMedium')
                      : t('baby.spitLarge')}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'diaper' && (
          <div className="field">
            <label>{t('calendar.types.diaper')}</label>
            <div className="chip-row">
              {DIAPERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${diaperKind === id ? 'active' : ''}`}
                  onClick={() => setDiaperKind(id)}
                >
                  {id === 'wet'
                    ? t('baby.diaperWet')
                    : id === 'dirty'
                      ? t('baby.diaperDirty')
                      : id === 'mixed'
                        ? t('baby.diaperMixed')
                        : t('baby.diaperDry')}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'sleep' && editing?.sleep?.ongoing && (
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            {t('baby.sleeping')}
            {sleepDurationMs(editing) != null
              ? ` · ${Math.round((sleepDurationMs(editing) ?? 0) / 60_000)}m`
              : ''}
          </p>
        )}

        {mode === 'indicator' && (
          <>
            <StyledSelect
              label={t('calendar.indicatorKind')}
              value={kind}
              onChange={(v) => {
                const next = v as IndicatorKind;
                setKind(next);
                setUnit(getIndicatorMeta(next).defaultUnit);
              }}
              options={BABY_READING_KINDS.map((k) => ({
                value: k,
                label: indicatorLabel(k, locale),
              }))}
            />
            <div className="field">
              <label>{t('calendar.indicatorValue')}</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('calendar.indicatorUnit')}</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </>
        )}
        </div>

        <div className="field-group">
          <div className="field-group-header-row">
            <div className="field-group-title">{t('calendar.readingTime')}</div>
            <button
              type="button"
              className="quick-now-btn"
              onClick={() => {
                setDay(todayIso());
                setHm(localHm());
              }}
            >
              {t('baby.setNow')}
            </button>
          </div>
          <StyledDateField
            label={t('calendar.startDate')}
            value={day}
            onChange={setDay}
          />
          <div className="field">
            <label>{t('calendar.readingTime')}</label>
            <input
              type="time"
              className="ui-time"
              value={hm}
              onChange={(e) => setHm(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{t('calendar.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="sheet-actions-sticky">
          {editing && onDelete && (
            <button
              type="button"
              className="btn btn-danger btn-block"
              style={{ marginBottom: '0.4rem' }}
              onClick={() => onDelete(editing.id)}
            >
              {t('calendar.delete')}
            </button>
          )}

          <div className="sheet-actions-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('calendar.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSave}
              onClick={handleSave}
            >
              {t('calendar.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
