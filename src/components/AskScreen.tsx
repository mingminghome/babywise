import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Baby,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Gauge,
  HeartPulse,
  ImagePlus,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import { activeBaby } from '../core/baby/logs';
import { formatBabyAge } from '../core/baby/age';
import {
  collectAskContext,
  mergeContextFlags,
  type AskContextFlags,
  type AskContextKey,
} from '../core/ai/askContext';
import { engineRunAsk } from '../core/ai/engine';
import type { RateLimitMeta } from '../core/ai/types';
import { prepareAskImage, type PreparedImage } from '../core/util/image';
import { SafetyBadge } from './SafetyBadge';
import type { AppState } from '../hooks/useAppState';
import type { AiProviderId, SafetyItem, SafetyResult } from '../core/types';

type RateHit = {
  code: 'rate_limited' | 'rate_limited_day';
  meta?: RateLimitMeta;
};

function formatAskWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleString(locale === 'zh-Hant' ? 'zh-Hant' : 'en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

function PerspectiveCards({
  result,
  t,
  compact = false,
}: {
  result: Pick<SafetyResult, 'tier' | 'western' | 'tcm'>;
  t: AppState['t'];
  compact?: boolean;
}) {
  const western = result.western ?? { tier: result.tier, summary: undefined };
  const tcm = result.tcm;

  if (compact) {
    return (
      <div className="ask-badge-row">
        <SafetyBadge
          tier={western.tier}
          t={t}
          label={t('ask.perspectiveWestern')}
        />
        {tcm ? (
          <SafetyBadge
            tier={tcm.tier}
            t={t}
            label={t('ask.perspectiveTcm')}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="ask-perspective-grid">
      <div className="ask-perspective-card">
        <SafetyBadge
          tier={western.tier}
          t={t}
          label={t('ask.perspectiveWestern')}
        />
        {western.summary ? (
          <p className="ask-perspective-note">{western.summary}</p>
        ) : null}
      </div>
      {tcm ? (
        <div className="ask-perspective-card">
          <SafetyBadge
            tier={tcm.tier}
            t={t}
            label={t('ask.perspectiveTcm')}
          />
          {tcm.summary ? (
            <p className="ask-perspective-note">{tcm.summary}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemRow({ item, t }: { item: SafetyItem; t: AppState['t'] }) {
  const western = item.western ?? { tier: item.tier };
  const tcm = item.tcm;
  return (
    <li className={`ask-item ask-item--${item.tier}`}>
      <div className="ask-item-top">
        <span className="ask-item-name">{item.name}</span>
        <div className="ask-badge-row">
          <SafetyBadge
            tier={western.tier}
            t={t}
            label={t('ask.perspectiveWestern')}
          />
          {tcm ? (
            <SafetyBadge
              tier={tcm.tier}
              t={t}
              label={t('ask.perspectiveTcm')}
            />
          ) : null}
        </div>
      </div>
      {item.note ? <p className="ask-item-note">{item.note}</p> : null}
    </li>
  );
}

function AskResultPanel({
  result,
  provider,
  t,
}: {
  result: SafetyResult;
  provider: string | null;
  t: AppState['t'];
}) {
  const [copied, setCopied] = useState(false);
  const multi = (result.items?.length ?? 0) > 1;
  const items = result.items ?? [];

  const handleCopy = async () => {
    const lines = [
      result.title,
      result.summary && result.summary !== result.title ? result.summary : '',
      result.western?.summary ? `[Western / 西醫]: ${result.western.summary}` : '',
      result.tcm?.summary ? `[TCM / 中醫]: ${result.tcm.summary}` : '',
      result.caveats?.length ? `Note: ${result.caveats.join('; ')}` : '',
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="ask-result" role="status">
      <div className="ask-result-head">
        <div className="ask-result-title-wrap">
          <h2 className="ask-result-title">{result.title}</h2>
          {provider ? (
            <span className="ask-result-meta muted">
              {t('ask.answeredBy', {
                name: t(`settings.providers.${provider}`),
              })}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm ask-copy-btn"
          onClick={handleCopy}
          title={t('ask.copyAnswer')}
        >
          {copied ? <Check size={14} className="copy-check" /> : <Copy size={14} />}
          <span>{copied ? t('ask.answerCopied') : t('ask.copyAnswer')}</span>
        </button>
      </div>

      {result.summary && result.summary !== result.title ? (
        <p className="ask-result-summary">{result.summary}</p>
      ) : null}

      <div className="ask-result-overall">
        {multi ? (
          <p className="ask-result-overall-label muted">
            {t('ask.overallLabel')}
          </p>
        ) : null}
        <PerspectiveCards result={result} t={t} />
      </div>

      {items.length > 0 ? (
        <div className="ask-items-block">
          <h3 className="ask-items-title">
            {multi ? t('ask.itemsTitle') : t('ask.itemDetailTitle')}
            {multi ? (
              <span className="ask-items-count muted">
                {t('ask.itemsCount', { n: items.length })}
              </span>
            ) : null}
          </h3>
          {multi ? (
            <p className="ask-items-hint muted">{t('ask.itemsHint')}</p>
          ) : null}
          <ul className="ask-items-list">
            {items.map((item) => (
              <ItemRow key={`${item.name}-${item.tier}`} item={item} t={t} />
            ))}
          </ul>
        </div>
      ) : null}

      {result.caveats?.length ? (
        <div className="ask-result-caveats">
          <h3 className="ask-result-caveats-title">{t('ask.caveatsTitle')}</h3>
          <ul>
            {result.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Ask: server multi-provider API keys via Worker. */
export function AskScreen({ state }: { state: AppState }) {
  const {
    settings,
    profile,
    events,
    babies,
    t,
    askHistory,
    pushAskHistory,
    removeAskHistory,
    pendingAsk,
    clearPendingAsk,
    homeMode = 'pregnancy',
  } = state;

  const isBabyMode = homeMode === 'baby';

  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateHit, setRateHit] = useState<RateHit | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentBaby = isBabyMode
    ? selectedBabyId
      ? babies.find((b) => b.id === selectedBabyId) ?? activeBaby(babies, settings.activeBabyId)
      : activeBaby(babies, settings.activeBabyId)
    : null;

  const babyAge = currentBaby ? formatBabyAge(currentBaby.birthDate, settings.locale) : '';

  const week = gaWeek(state);
  const provider = settings.ai.provider ?? 'gemini';
  const providerLabel = t(`settings.providers.${provider}`);
  const canSubmit = Boolean(text.trim() || photo);

  const bundle = useMemo(
    () =>
      collectAskContext(profile, events, settings.locale, {
        baby: currentBaby,
        mode: homeMode,
      }),
    [
      profile,
      events,
      settings.locale,
      currentBaby,
      homeMode,
    ]
  );

  const [activeFlags, setActiveFlags] = useState<AskContextFlags>(() =>
    mergeContextFlags(settings.ai.contextPrefs)
  );

  const toggleContextKey = (key: AskContextKey) => {
    setActiveFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Determine available context items from bundle
  const availableContextItems = useMemo(() => {
    const list: Array<{
      key: AskContextKey;
      label: string;
      icon?: string;
      detail: string;
    }> = [];
    if (isBabyMode) {
      if (bundle.babyAge) {
        list.push({
          key: 'babyAge',
          label: currentBaby ? `${currentBaby.name} (${babyAge})` : bundle.babyAge,
          icon: '👶',
          detail: currentBaby ? `${currentBaby.name} (${babyAge})` : bundle.babyAge,
        });
      }
      if (bundle.babyFeeds?.length) {
        list.push({
          key: 'babyFeeds',
          label: t('ask.context.babyFeeds'),
          icon: '🍼',
          detail: bundle.babyFeeds.join(' · '),
        });
      }
      if (bundle.babyDiapers?.length) {
        list.push({
          key: 'babyDiapers',
          label: t('ask.context.babyDiapers'),
          icon: '🧷',
          detail: bundle.babyDiapers.join(' · '),
        });
      }
      if (bundle.babySleep?.length) {
        list.push({
          key: 'babySleep',
          label: t('ask.context.babySleep'),
          icon: '💤',
          detail: bundle.babySleep.join(' · '),
        });
      }
      if (bundle.babyWeight) {
        list.push({
          key: 'babyWeight',
          label: bundle.babyWeight,
          icon: '⚖️',
          detail: bundle.babyWeight,
        });
      }
      if (bundle.medicines?.length) {
        list.push({
          key: 'medicines',
          label: t('ask.context.medicines'),
          icon: '💊',
          detail: bundle.medicines.join(' · '),
        });
      }
      if (bundle.appointments?.length) {
        list.push({
          key: 'appointments',
          label: t('ask.context.appointments'),
          icon: '📅',
          detail: bundle.appointments.join(' · '),
        });
      }
    } else {
      if (bundle.week) {
        list.push({
          key: 'week',
          label: bundle.week,
          icon: '🤰',
          detail: bundle.week,
        });
      }
      if (bundle.dueDate) {
        list.push({
          key: 'dueDate',
          label: `${t('ask.context.dueDate')}: ${bundle.dueDate}`,
          icon: '📅',
          detail: bundle.dueDate,
        });
      }
      if (bundle.medicines?.length) {
        list.push({
          key: 'medicines',
          label: t('ask.context.medicines'),
          icon: '💊',
          detail: bundle.medicines.join(' · '),
        });
      }
      if (bundle.takenToday?.length) {
        list.push({
          key: 'takenToday',
          label: t('ask.context.takenToday'),
          icon: '✓',
          detail: bundle.takenToday.join(' · '),
        });
      }
      if (bundle.weight) {
        list.push({
          key: 'weight',
          label: bundle.weight,
          icon: '⚖️',
          detail: bundle.weight,
        });
      }
      if (bundle.readings?.length) {
        list.push({
          key: 'readings',
          label: t('ask.context.readings'),
          icon: '🩺',
          detail: bundle.readings.join(' · '),
        });
      }
      if (bundle.appointments?.length) {
        list.push({
          key: 'appointments',
          label: t('ask.context.appointments'),
          icon: '📅',
          detail: bundle.appointments.join(' · '),
        });
      }
    }
    return list;
  }, [bundle, isBabyMode, currentBaby, babyAge, t]);

  const activeCount = availableContextItems.filter((item) => activeFlags[item.key]).length;

  const suggestedTopics = useMemo(() => {
    if (isBabyMode) {
      return [
        { id: 'feeds', text: t('ask.suggestedBabyFeeds') },
        { id: 'fever', text: t('ask.suggestedBabyFever') },
        { id: 'sleep', text: t('ask.suggestedBabySleep') },
        { id: 'diapers', text: t('ask.suggestedBabyDiapers') },
        { id: 'lactation', text: t('ask.suggestedBabyLactation') },
      ];
    }
    return [
      { id: 'food', text: t('ask.suggestedPregnancyFood') },
      { id: 'meds', text: t('ask.suggestedPregnancyMeds') },
      { id: 'bp', text: t('ask.suggestedPregnancyBp') },
      { id: 'contractions', text: t('ask.suggestedPregnancyContractions') },
      { id: 'sleep', text: t('ask.suggestedPregnancySleep') },
    ];
  }, [isBabyMode, t]);

  const rateLimitMessage = (hit: RateHit): string => {
    const w = hit.meta?.window;
    const n = hit.meta?.limit;
    const s = hit.meta?.retryAfterSec ?? 60;
    if (hit.code === 'rate_limited_day' || w === 'long' || w === 'day') {
      const waitMin = Math.max(1, Math.ceil(s / 60));
      return t('ask.rateLimitLongDetail', {
        n: n ?? 40,
        m: waitMin,
      });
    }
    return t('ask.rateLimitShortDetail', {
      n: n ?? 8,
      w: hit.meta?.windowSec ?? 60,
      s,
    });
  };

  const onPickPhoto = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setRateHit(null);
    try {
      const prepared = await prepareAskImage(file);
      setPhoto(prepared);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'image_too_large') setError(t('ask.photoTooLarge'));
      else setError(t('ask.photoInvalid'));
      setPhoto(null);
    } finally {
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const clearComposer = () => {
    setText('');
    setPhoto(null);
  };

  const runAsk = async (presetQuestion?: string) => {
    setError(null);
    setRateHit(null);
    setResult(null);
    setLastProvider(null);
    const question = (presetQuestion ?? text).trim();
    if (!question && !photo) {
      setError(t('ask.needText'));
      return;
    }
    const attached = photo;
    setLoading(true);
    try {
      const out = await engineRunAsk({
        question,
        locale: settings.locale,
        mode: homeMode,
        babyName: isBabyMode && currentBaby ? currentBaby.name : undefined,
        pregnancyWeek: isBabyMode ? undefined : week,
        context: bundle,
        include: activeFlags,
        provider,
        image: attached
          ? { mimeType: attached.mimeType, data: attached.data }
          : undefined,
      });
      if (!out.ok) {
        if (out.code === 'rate_limited' || out.code === 'rate_limited_day') {
          const hit: RateHit = {
            code: out.code,
            meta: out.rateLimit,
          };
          setRateHit(hit);
          setError(rateLimitMessage(hit));
          return;
        }
        const byCode: Record<string, string> = {
          gemini_not_configured: t('ask.geminiNotConfigured'),
          provider_not_configured: t('ask.providerNotConfigured', {
            name: providerLabel,
          }),
          forbidden_origin: t('ask.forbiddenOrigin'),
          bad_request: t('ask.badRequest'),
          parse_error: t('ask.parseError'),
          upstream_error: t('ask.upstreamError'),
          upstream_quota: t('ask.upstreamQuota'),
          upstream_unavailable: t('ask.upstreamUnavailable'),
          empty_response: t('ask.emptyResponse'),
          server_error: t('ask.serverError'),
        };
        setError((out.code && byCode[out.code]) || t('ask.serverError'));
        return;
      }
      const used = out.provider ?? provider;
      setLastProvider(used);
      setResult(out.result);
      clearComposer();
      const queryLabel =
        question ||
        out.result.title ||
        (settings.locale === 'zh-Hant' ? '（照片）' : '(photo)');
      pushAskHistory({
        id: crypto.randomUUID(),
        query: queryLabel.slice(0, 120),
        hadImage: Boolean(attached),
        via: 'api',
        provider: used,
        result: out.result,
        at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggested = (promptText: string) => {
    // Strip leading emoji if present
    const clean = promptText.replace(/^[^\w\u4e00-\u9fa5]+\s*/, '');
    setText(clean);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (!pendingAsk) return;
    const q = pendingAsk.question;
    const auto = pendingAsk.autoSubmit;
    clearPendingAsk();
    setText(q);
    if (auto) void runAsk(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume once on mount/nav
  }, [pendingAsk]);

  const openHistoryItem = (item: (typeof askHistory)[number]) => {
    clearComposer();
    setResult(item.result);
    setLastProvider(item.provider ?? null);
    setError(null);
    setRateHit(null);
    getScrollMain()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recent = askHistory.slice(0, 12);
  const inputPlaceholder = photo
    ? t('ask.placeholderWithPhoto')
    : isBabyMode
      ? settings.locale === 'zh-Hant'
        ? '請教寶寶餵奶、發燒警訊、睡眠、尿布或副食品…'
        : 'Ask about baby feeds, fever, sleep, diapers, or newborn symptoms…'
      : t('ask.placeholder');

  return (
    <>
      <header className="page-heading ask-page-heading">
        <div className="ask-header-top">
          <h1>{t('ask.title')}</h1>
          <span className={`ask-mode-badge ${isBabyMode ? 'is-baby' : 'is-pregnancy'}`}>
            {isBabyMode ? (
              <>
                <Baby size={14} />
                <span>{t('ask.modeBaby')}</span>
              </>
            ) : (
              <>
                <HeartPulse size={14} />
                <span>{week ? `${t('ask.modePregnancy')} · W${week}` : t('ask.modePregnancy')}</span>
              </>
            )}
          </span>
        </div>
        <p className="subtitle">{t('ask.simpleHint')}</p>

        {/* Multi-baby switcher if user has > 1 baby in baby mode */}
        {isBabyMode && babies.length > 1 && (
          <div className="ask-baby-switch-bar">
            <span className="ask-switch-label muted">{t('ask.switchBaby')}:</span>
            <div className="ask-baby-chips">
              {babies.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`chip ${currentBaby?.id === b.id ? 'chip-active' : ''}`}
                  onClick={() => setSelectedBabyId(b.id)}
                >
                  <Baby size={13} />
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Context telemetry bar */}
      <section className="card ask-context-card">
        <div className="ask-context-head">
          <div className="ask-context-info">
            <Info size={15} className="ask-context-icon" />
            <strong className="ask-context-title">{t('ask.attachedContextTitle')}</strong>
            <span className="ask-context-count">
              {activeCount} / {availableContextItems.length}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm ask-context-toggle"
            onClick={() => setShowContextDetails(!showContextDetails)}
          >
            <span>{showContextDetails ? t('ask.hideAttachedDetails') : t('ask.attachedDetails')}</span>
            {showContextDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Pill tags of attached data - Click to toggle / deselect */}
        <div className="ask-pills-row" role="group" aria-label={t('ask.attachedContextTitle')}>
          {availableContextItems.length > 0 ? (
            availableContextItems.map((item) => {
              const isIncluded = Boolean(activeFlags[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`ask-data-pill ${isIncluded ? 'is-active' : 'is-deselected'}`}
                  onClick={() => toggleContextKey(item.key)}
                  aria-pressed={isIncluded}
                  title={isIncluded ? t('calendar.delete') : t('calendar.add')}
                >
                  {item.icon && <span className="pill-emoji">{item.icon}</span>}
                  <span className="pill-label">{item.label}</span>
                  <span className="pill-toggle-icon" aria-hidden="true">
                    {isIncluded ? '×' : '+'}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              {t('settings.askContextEmpty')}
            </span>
          )}
        </div>

        {/* Expandable context details (default folded) */}
        {showContextDetails && (
          <div className="ask-context-details">
            <p className="ask-context-hint muted">{t('ask.tapToToggleContext')}</p>
            <div className="ask-context-checklist">
              {availableContextItems.map((item) => {
                const isIncluded = Boolean(activeFlags[item.key]);
                return (
                  <label
                    key={item.key}
                    className={`ask-context-checklist-item ${isIncluded ? 'is-included' : 'is-excluded'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleContextKey(item.key)}
                    />
                    <div className="ask-context-checklist-content">
                      <span className="ask-context-item-name">
                        {item.icon} {t(`ask.context.${item.key}`)}
                      </span>
                      <span className="ask-context-item-detail muted">
                        {item.detail}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Composer Card */}
      <section className="card stack ask-composer">
        {/* Hidden Camera inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => void onPickPhoto(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => void onPickPhoto(e.target.files?.[0])}
        />

        {photo ? (
          <div className="ask-photo-wrap">
            <div className="ask-photo-frame">
              <img src={photo.dataUrl} alt="" className="photo-preview" />
              <button
                type="button"
                className="ask-photo-x"
                aria-label={t('ask.removePhoto')}
                onClick={() => setPhoto(null)}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <p className="ask-photo-caption muted">{t('ask.photoLabelHint')}</p>
          </div>
        ) : null}

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ask-input">
            {photo ? t('ask.noteOptional') : isBabyMode && currentBaby ? `${t('ask.askingFor')} ${currentBaby.name}` : t('ask.placeholder')}
          </label>
          <textarea
            ref={textareaRef}
            id="ask-input"
            value={text}
            placeholder={inputPlaceholder}
            onChange={(e) => setText(e.target.value)}
            rows={photo ? 2 : 3}
          />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="ask-suggested-wrap">
          <span className="ask-suggested-title muted">{t('ask.suggestedTitle')}:</span>
          <div className="ask-suggested-chips">
            {suggestedTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="ask-chip-btn"
                onClick={() => handleSelectSuggested(topic.text)}
              >
                {topic.text}
              </button>
            ))}
          </div>
        </div>

        {/* Photo and Camera action buttons */}
        {!photo ? (
          <div className="ask-photo-actions">
            <button
              type="button"
              className="btn btn-ghost ask-photo-action"
              disabled={loading}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={16} />
              {t('ask.photo')}
            </button>
            <button
              type="button"
              className="btn btn-ghost ask-photo-action"
              disabled={loading}
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus size={16} />
              {t('ask.gallery')}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-block ask-submit-btn"
          disabled={loading || !canSubmit}
          onClick={() => void runAsk()}
        >
          <Sparkles size={17} className={loading ? 'spin-icon' : ''} />
          <span>
            {loading
              ? t('ask.autoCheckingNamed', { name: providerLabel })
              : t('ask.autoAnswerNamed', { name: providerLabel })}
          </span>
        </button>

        <div className="ask-footer-notes">
          <p className="ask-free-note muted">
            <Gauge size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {t('ask.rateLimitFreeNote')}
          </p>
          <p className="muted" style={{ fontSize: '0.78rem' }}>
            {photo ? t('ask.photoAutoHint') : t('ask.autoHint')}
          </p>
        </div>

        {rateHit ? (
          <div className="rate-limit-banner" role="alert">
            <div className="rate-limit-banner-top">
              <span className="rate-limit-badge">{t('ask.rateLimitBadge')}</span>
              <strong className="rate-limit-title">
                {rateHit.code === 'rate_limited_day' ||
                rateHit.meta?.window === 'long' ||
                rateHit.meta?.window === 'day'
                  ? t('ask.rateLimitedLongTitle')
                  : t('ask.rateLimitRpmTitle')}
              </strong>
            </div>
            <p className="rate-limit-detail">{rateLimitMessage(rateHit)}</p>
            <p className="rate-limit-policy muted">{t('ask.rateLimitFreeNote')}</p>
          </div>
        ) : null}

        {error && !rateHit ? (
          <p className="ask-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {/* Answer Result Display */}
      {result && (
        <section className="card ask-result-card">
          <AskResultPanel result={result} provider={lastProvider} t={t} />
        </section>
      )}

      {/* Recent Question History */}
      {recent.length > 0 && (
        <section className="card ask-history-card">
          <div className="ask-history-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              {t('ask.history')}
            </h2>
            <span className="ask-history-count muted">
              {t('ask.historyCount', { n: recent.length })}
            </span>
          </div>
          <p className="ask-history-hint muted">{t('ask.historyHint')}</p>
          <ul className="ask-history-list">
            {recent.map((item) => {
              const providerName = item.provider
                ? t(`settings.providers.${item.provider as AiProviderId}`)
                : t('ask.viaGemini');
              const multi = (item.result.items?.length ?? 0) > 1;
              return (
                <li key={item.id} className="ask-history-item">
                  <button
                    type="button"
                    className="ask-history-main"
                    onClick={() => openHistoryItem(item)}
                  >
                    <span className="ask-history-query">
                      {item.hadImage ? '📷 ' : ''}
                      {item.query}
                      {multi
                        ? ` · ${t('ask.itemsCount', {
                            n: item.result.items!.length,
                          })}`
                        : ''}
                    </span>
                    <span className="ask-history-meta muted">
                      {providerName}
                      {' · '}
                      {formatAskWhen(item.at, settings.locale)}
                    </span>
                    <PerspectiveCards result={item.result} t={t} compact />
                  </button>
                  <button
                    type="button"
                    className="ask-history-delete"
                    aria-label={t('calendar.delete')}
                    onClick={() => removeAskHistory(item.id)}
                  >
                    <X size={16} strokeWidth={2.25} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function getScrollMain(): HTMLElement | null {
  return document.querySelector('.app-main');
}

function gaWeek(state: AppState): number | null {
  const { ga } = state;
  return ga && ga.totalDays >= 0 ? ga.weeks : null;
}
