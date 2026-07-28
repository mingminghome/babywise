import { useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react';
import {
  collectAskContext,
  mergeContextFlags,
} from '../core/ai/askContext';
import { engineRunAsk } from '../core/ai/engine';
import { prepareAskImage, type PreparedImage } from '../core/util/image';
import { SafetyBadge } from './SafetyBadge';
import type { AppState } from '../hooks/useAppState';
import type { AiProviderId, SafetyItem, SafetyResult } from '../core/types';

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
  const multi = (result.items?.length ?? 0) > 1;
  const items = result.items ?? [];

  return (
    <div className="ask-result" role="status">
      <div className="ask-result-head">
        <h2 className="ask-result-title">{result.title}</h2>
        {provider ? (
          <span className="ask-result-meta muted">
            {t('ask.answeredBy', {
              name: t(`settings.providers.${provider}`),
            })}
          </span>
        ) : null}
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
    t,
    askHistory,
    pushAskHistory,
    removeAskHistory,
  } = state;

  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const week = gaWeek(state);
  const provider = settings.ai.provider ?? 'gemini';
  const providerLabel = t(`settings.providers.${provider}`);
  const canSubmit = Boolean(text.trim() || photo);

  const bundle = useMemo(
    () => collectAskContext(profile, events, settings.locale),
    [profile, events, settings.locale]
  );

  const flags = mergeContextFlags(settings.ai.contextPrefs);

  const onPickPhoto = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
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

  const runAsk = async () => {
    setError(null);
    setResult(null);
    setLastProvider(null);
    if (!text.trim() && !photo) {
      setError(t('ask.needText'));
      return;
    }
    const question = text.trim();
    const attached = photo;
    setLoading(true);
    try {
      const out = await engineRunAsk({
        question,
        locale: settings.locale,
        pregnancyWeek: week,
        context: bundle,
        include: flags,
        provider,
        image: attached
          ? { mimeType: attached.mimeType, data: attached.data }
          : undefined,
      });
      if (!out.ok) {
        const byCode: Record<string, string> = {
          gemini_not_configured: t('ask.geminiNotConfigured'),
          provider_not_configured: t('ask.providerNotConfigured', {
            name: providerLabel,
          }),
          rate_limited: t('ask.rateLimited'),
          rate_limited_day: t('ask.rateLimitedDay'),
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
      // Clear text + photo after a successful answer
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

  const openHistoryItem = (item: (typeof askHistory)[number]) => {
    clearComposer();
    setResult(item.result);
    setLastProvider(item.provider ?? null);
    setError(null);
    getScrollMain()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recent = askHistory.slice(0, 12);
  const inputPlaceholder = photo
    ? t('ask.placeholderWithPhoto')
    : t('ask.placeholder');

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('ask.title')}</h1>
          <p className="subtitle">{t('ask.simpleHint')}</p>
        </div>
      </header>

      <section className="card stack ask-composer">
        {/* Camera: prefers rear camera on mobile */}
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
        {/* Gallery / files without capture so users can pick existing photos */}
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
            {photo ? t('ask.noteOptional') : t('ask.placeholder')}
          </label>
          <textarea
            id="ask-input"
            value={text}
            placeholder={inputPlaceholder}
            onChange={(e) => setText(e.target.value)}
            rows={photo ? 2 : 3}
          />
        </div>

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
          className="btn btn-primary btn-block"
          disabled={loading || !canSubmit}
          onClick={runAsk}
        >
          <Sparkles size={16} />
          {loading
            ? t('ask.autoCheckingNamed', { name: providerLabel })
            : t('ask.autoAnswerNamed', { name: providerLabel })}
        </button>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          {photo ? t('ask.photoAutoHint') : t('ask.autoHint')}
        </p>

        {error && (
          <p className="ask-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="card">
          <AskResultPanel result={result} provider={lastProvider} t={t} />
        </section>
      )}

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
