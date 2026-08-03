import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  ASK_CONTEXT_KEYS,
  collectAskContext,
  mergeContextFlags,
  type AskContextKey,
} from '../core/ai/askContext';
import { fetchAskProviders } from '../core/ai/client';
import {
  canNotify,
  getNotificationCapability,
  isIosDevice,
  isStandaloneApp,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationCapability,
} from '../core/notifications/local';
import { CleanDataPanel } from './CleanDataPanel';
import { DataBackupPanel } from './DataBackupPanel';
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
    exportBackup,
    importBackup,
    setTab,
    profile,
    events,
  } = state;
  const [sampleConfirm, setSampleConfirm] = useState(false);
  const [sampleMsg, setSampleMsg] = useState<string | null>(null);
  const [notifCap, setNotifCap] = useState<NotificationCapability | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
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

  const refreshNotifCap = async () => {
    const cap = await getNotificationCapability();
    setNotifCap(cap);
    return cap;
  };

  useEffect(() => {
    void refreshNotifCap();
  }, [settings.notificationsEnabled]);

  return (
    <div className="layout-grid">
      <header className="page-heading span-2">
        <h1>{t('settings.title')}</h1>
        <p className="subtitle">{t('settings.subtitle')}</p>
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
        <h2 className="section-title">
          <Bell size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('settings.notifications')}
        </h2>
        <StyledCheckbox
          id="notify-enable"
          checked={settings.notificationsEnabled}
          label={`${t('settings.enableNotifications')}${canNotify() ? ' ✓' : ''}`}
          onChange={async (enabled) => {
            if (enabled) {
              const perm = await requestNotificationPermission();
              patch({ notificationsEnabled: perm === 'granted' });
              await refreshNotifCap();
              if (perm !== 'granted') {
                setTestMsg(t('settings.notifPermissionDenied'));
                window.setTimeout(() => setTestMsg(null), 4000);
              }
            } else {
              patch({ notificationsEnabled: false });
              await refreshNotifCap();
            }
          }}
        />
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          {t('settings.notificationHint')}
        </p>
        <p className="muted notif-status" style={{ fontSize: '0.82rem', marginTop: 6 }}>
          {notifCap
            ? !notifCap.supported
              ? t('settings.notifUnsupported')
              : notifCap.permission === 'granted'
                ? t('settings.notifStatusGranted')
                : notifCap.permission === 'denied'
                  ? t('settings.notifStatusDenied')
                  : t('settings.notifStatusDefault')
            : t('settings.notifStatusChecking')}
          {notifCap?.serviceWorkerReady
            ? ` · ${t('settings.notifSwReady')}`
            : notifCap
              ? ` · ${t('settings.notifSwPending')}`
              : ''}
        </p>
        {isIosDevice() && !isStandaloneApp() ? (
          <p className="muted notif-ios-tip" style={{ fontSize: '0.82rem', marginTop: 6 }}>
            {t('settings.notifIosInstallTip')}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10 }}
          onClick={async () => {
            setTestMsg(null);
            if (!settings.notificationsEnabled) {
              const perm = await requestNotificationPermission();
              if (perm !== 'granted') {
                setTestMsg(t('settings.notifPermissionDenied'));
                await refreshNotifCap();
                return;
              }
              patch({ notificationsEnabled: true });
            }
            const ok = await sendTestNotification(
              t('appName'),
              t('settings.notifTestBody')
            );
            await refreshNotifCap();
            setTestMsg(
              ok ? t('settings.notifTestSent') : t('settings.notifTestFailed')
            );
            window.setTimeout(() => setTestMsg(null), 4000);
          }}
        >
          <Bell size={16} />
          {t('settings.notifTest')}
        </button>
        {testMsg ? (
          <div className="clean-result" role="status" style={{ marginTop: 10 }}>
            {testMsg}
          </div>
        ) : null}
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

      <DataBackupPanel
        t={t}
        exportBackup={exportBackup}
        importBackup={importBackup}
      />

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

      <p className="muted settings-version span-2">
        {t('settings.version', { v: APP_VERSION })}
      </p>
    </div>
  );
}
