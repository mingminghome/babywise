import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bug,
  ChevronRight,
  Code2,
  ExternalLink,
  Info,
  Scale,
  Tag,
} from 'lucide-react';
import {
  ASK_CONTEXT_KEYS,
  collectAskContext,
  mergeContextFlags,
  type AskContextKey,
} from '../core/ai/askContext';
import { fetchAskProviders } from '../core/ai/client';
import {
  canNotify,
  requestNotificationPermission,
} from '../core/notifications/local';
import { PROJECT } from '../core/project';
import { CleanDataPanel } from './CleanDataPanel';
import { StyledCheckbox } from './ui/StyledCheckbox';
import type { AppState } from '../hooks/useAppState';
import {
  AI_PROVIDERS,
  type AiProviderId,
  type Locale,
  type ThemeMode,
} from '../core/types';
import { APP_VERSION } from '../version';

export function SettingsScreen({ state }: { state: AppState }) {
  const {
    settings,
    updateSettings,
    t,
    cleanData,
    loadSampleData,
    dataSummary,
    setTab,
    profile,
    events,
  } = state;
  const [sampleConfirm, setSampleConfirm] = useState(false);
  const [sampleMsg, setSampleMsg] = useState<string | null>(null);
  /** null = still loading / unknown; set of configured provider ids once loaded */
  const [availableProviders, setAvailableProviders] = useState<
    Set<AiProviderId> | null
  >(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const contextBundle = useMemo(
    () => collectAskContext(profile, events, settings.locale),
    [profile, events, settings.locale]
  );
  const contextFlags = mergeContextFlags(settings.ai.contextPrefs);

  const toggleContextFlag = (key: AskContextKey, on: boolean) => {
    updateSettings({
      ...settings,
      ai: {
        ...settings.ai,
        contextPrefs: { ...contextFlags, [key]: on },
      },
    });
  };

  const patch = (partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await fetchAskProviders();
      if (cancelled) return;
      if (!status) {
        // Network / unknown — leave options enabled so the user can still choose.
        setAvailableProviders(null);
        return;
      }
      const available = new Set(status.available);
      setAvailableProviders(available);

      const current = settingsRef.current.ai.provider ?? 'gemini';
      if (available.size > 0 && !available.has(current)) {
        const fallback =
          (available.has(status.default) && status.default) ||
          status.available[0];
        if (fallback) {
          const s = settingsRef.current;
          updateSettings({
            ...s,
            ai: { ...s.ai, provider: fallback },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateSettings]);

  return (
    <div className="layout-grid">
      <header className="app-header span-2">
        <div>
          <h1>{t('settings.title')}</h1>
        </div>
      </header>

      <section className="card">
        <h2 className="section-title">{t('settings.language')}</h2>
        <div className="chip-row">
          {(
            [
              ['en', 'English'],
              ['zh-Hant', '繁體中文'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.locale === id ? 'active' : ''}`}
              onClick={() => patch({ locale: id as Locale })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">{t('settings.theme')}</h2>
        <div className="chip-row">
          {(
            [
              ['warm-light', 'settings.themes.warm-light'],
              ['warm-dark', 'settings.themes.warm-dark'],
              ['system', 'settings.themes.system'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.theme === id ? 'active' : ''}`}
              onClick={() => patch({ theme: id as ThemeMode })}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.provider')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.providerHint')}
        </p>
        <div className="chip-row">
          {AI_PROVIDERS.map((id) => {
            const configured =
              availableProviders === null || availableProviders.has(id);
            const selected = settings.ai.provider === id;
            return (
              <button
                key={id}
                type="button"
                className={`chip ${selected ? 'active' : ''}${!configured ? ' is-disabled' : ''}`}
                disabled={!configured}
                title={
                  configured ? undefined : t('settings.providerNotSetUp')
                }
                aria-disabled={!configured}
                onClick={() => {
                  if (!configured) return;
                  patch({
                    ai: {
                      ...settings.ai,
                      provider: id as AiProviderId,
                    },
                  });
                }}
              >
                {t(`settings.providers.${id}`)}
                {!configured ? (
                  <span className="chip-badge muted">
                    {t('settings.providerNotSetUpShort')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          {t('settings.providerServerNote')}
        </p>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.notifications')}</h2>
        <StyledCheckbox
          id="notify-enable"
          checked={settings.notificationsEnabled}
          label={`${t('settings.enableNotifications')}${canNotify() ? ' ✓' : ''}`}
          onChange={async (enabled) => {
            if (enabled) {
              const perm = await requestNotificationPermission();
              patch({ notificationsEnabled: perm === 'granted' });
            } else {
              patch({ notificationsEnabled: false });
            }
          }}
        />
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          {t('settings.notificationHint')}
        </p>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.askContextTitle')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
          {t('settings.askContextHint')}
        </p>
        <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 10 }}>
          {t('settings.askContextEmpty')}
        </p>
        <div className="ask-context-list">
          {ASK_CONTEXT_KEYS.map((key) => {
            const preview = contextBundle[key];
            const previewText = Array.isArray(preview)
              ? preview.join(', ')
              : preview
                ? String(preview)
                : '';
            return (
              <div key={key} className="ask-context-item">
                <StyledCheckbox
                  id={`settings-ctx-${key}`}
                  checked={!!contextFlags[key]}
                  onChange={(on) => toggleContextFlag(key, on)}
                  label={t(`ask.context.${key}`)}
                />
                {contextFlags[key] && (
                  <p className="ask-context-preview muted">
                    {previewText || t('settings.askContextNoData')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.loadSample')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.loadSampleHint')}
        </p>
        {!sampleConfirm ? (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              setSampleMsg(null);
              setSampleConfirm(true);
            }}
          >
            {t('settings.loadSample')}
          </button>
        ) : (
          <div className="stack">
            <p className="muted">{t('settings.loadSampleConfirm')}</p>
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSampleConfirm(false)}
              >
                {t('settings.cleanCancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const result = loadSampleData();
                  setSampleConfirm(false);
                  setSampleMsg(
                    t('settings.loadSampleDoneDetail', {
                      week: result.weeksHint,
                      n: result.eventCount,
                    })
                  );
                  window.setTimeout(() => setSampleMsg(null), 4000);
                }}
              >
                {t('settings.loadSample')}
              </button>
            </div>
          </div>
        )}
        {sampleMsg && (
          <div className="clean-result" role="status" style={{ marginTop: 10 }}>
            {sampleMsg}
          </div>
        )}
      </section>

      <div className="span-2">
        <CleanDataPanel
          t={t}
          summary={dataSummary}
          onClean={cleanData}
          onCleaned={(cat) => {
            if (cat === 'all') setTab('home');
          }}
        />
      </div>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.aboutProject')}</h2>
        <p className="muted settings-oss-version">
          {t('settings.version', { v: APP_VERSION })}
          {' · '}
          {t('about.licenseShort')}
        </p>
        <p className="muted" style={{ fontSize: '0.88rem', marginTop: 4 }}>
          {t('settings.ossHint')}
        </p>
        <ul className="settings-oss-list">
          <li>
            <a
              href={PROJECT.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="settings-oss-row"
            >
              <span className="about-link-left">
                <Code2 size={18} />
                <span>
                  <strong>{t('settings.ossSource')}</strong>
                  <span className="muted about-link-sub">{PROJECT.repoLabel}</span>
                </span>
              </span>
              <ExternalLink size={16} className="muted" aria-hidden />
            </a>
          </li>
          <li>
            <a
              href={PROJECT.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="settings-oss-row"
            >
              <span className="about-link-left">
                <Scale size={18} />
                <span>
                  <strong>{t('settings.ossLicense')}</strong>
                  <span className="muted about-link-sub">
                    {t('settings.ossLicenseHint')}
                  </span>
                </span>
              </span>
              <ExternalLink size={16} className="muted" aria-hidden />
            </a>
          </li>
          <li>
            <a
              href={PROJECT.issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="settings-oss-row"
            >
              <span className="about-link-left">
                <Bug size={18} />
                <span>
                  <strong>{t('settings.ossIssues')}</strong>
                  <span className="muted about-link-sub">
                    {t('settings.ossIssuesHint')}
                  </span>
                </span>
              </span>
              <ExternalLink size={16} className="muted" aria-hidden />
            </a>
          </li>
          <li>
            <a
              href={PROJECT.releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="settings-oss-row"
            >
              <span className="about-link-left">
                <Tag size={18} />
                <span>
                  <strong>{t('settings.ossReleases')}</strong>
                  <span className="muted about-link-sub">
                    {t('settings.ossReleasesHint')}
                  </span>
                </span>
              </span>
              <ExternalLink size={16} className="muted" aria-hidden />
            </a>
          </li>
        </ul>
        <button
          type="button"
          className="about-link-row settings-about-more"
          onClick={() => setTab('about')}
        >
          <span className="about-link-left">
            <Info size={18} />
            <span>
              <strong>{t('settings.about')}</strong>
              <span className="muted about-link-sub">
                {t('settings.aboutLinkHint')}
              </span>
            </span>
          </span>
          <ChevronRight size={18} className="muted" />
        </button>
      </section>
    </div>
  );
}
