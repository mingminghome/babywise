import { useEffect, useMemo, useRef, useState } from 'react';
import { Baby, Bell, CalendarHeart, HeartPulse, Plus, Timer } from 'lucide-react';
import { activeBaby } from '../core/baby/logs';
import { formatBabyAge } from '../core/baby/age';
import { BabyProfileSheet } from './BabyProfileSheet';
import {
  BABY_CONTEXT_KEYS,
  PREGNANCY_CONTEXT_KEYS,
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
import { LOCALE_OPTIONS } from '../core/i18n';
import {
  AI_PROVIDERS,
  DEFAULT_LABOR_HOME_WEEK,
  type AiProviderId,
  type LaborHomeMode,
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
    babies,
    saveBaby,
    laborRule,
    homeMode = 'pregnancy',
  } = state;
  const locale = settings.locale;
  const [babySheet, setBabySheet] = useState(false);
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
    () =>
      collectAskContext(profile, events, settings.locale, {
        baby: activeBaby(babies, settings.activeBabyId),
        mode: homeMode,
      }),
    [
      profile,
      events,
      settings.locale,
      babies,
      settings.activeBabyId,
      homeMode,
    ]
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

      <details className="settings-fold span-2" open>
        <summary className="settings-fold-summary">{t('settings.groupLook')}</summary>
        <div className="settings-fold-body">

      <section className="card">
        <h2 className="section-title">{t('settings.language')}</h2>
        <div className="chip-row">
          {LOCALE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.locale === id ? 'active' : ''}`}
              onClick={() => patch({ locale: id })}
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
        <h2 className="section-title">{t('settings.weekDisplay')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.weekDisplayHint')}
        </p>
        <div className="chip-row">
          {(
            [
              'weeks_days',
              'clinical',
              'week_day',
            ] as const
          ).map((id) => (
            <button
              key={id}
              type="button"
              className={`chip ${(settings.gestationalDisplay ?? 'weeks_days') === id ? 'active' : ''}`}
              onClick={() => patch({ gestationalDisplay: id })}
            >
              {t(`settings.weekDisplayStyles.${id}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.showMascot')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.showMascotHint')}
        </p>
        <StyledCheckbox
          id="show-mascot"
          checked={settings.showMascot !== false}
          label={t('settings.showMascotLabel')}
          onChange={(on) => patch({ showMascot: on })}
        />
        <div style={{ marginTop: 10 }}>
          <StyledCheckbox
            id="show-baby-mascot"
            checked={settings.showBabyMascot !== false}
            label={t('settings.showBabyMascotLabel')}
            onChange={(on) => patch({ showBabyMascot: on })}
          />
        </div>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 8 }}>
          {t('settings.showBabyMascotHint')}
        </p>
      </section>
        </div>
      </details>

      <details className="settings-fold span-2" open>
        <summary className="settings-fold-summary">{t('settings.groupCare')}</summary>
        <div className="settings-fold-body">

      <section className="card span-2">
        <h2 className="section-title">
          <Baby size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('settings.homeModeTitle')}
        </h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
          {t('settings.homeModeHint')}
        </p>

        <div className="home-mode-grid" role="radiogroup" aria-label={t('settings.homeModeTitle')}>
          <button
            type="button"
            className={`home-mode-card ${settings.homeMode !== 'baby' && !settings.hidePregnancy ? 'is-active' : ''}`}
            onClick={() =>
              patch({
                homeMode: 'pregnancy',
                hidePregnancy: false,
                babyCareEnabled: true,
              })
            }
          >
            <span className="home-mode-icon">
              <CalendarHeart size={20} />
            </span>
            <div className="home-mode-info">
              <span className="home-mode-name">{t('settings.homeModePregnancy')}</span>
              <span className="home-mode-desc">{t('settings.homeModePregnancyDesc')}</span>
            </div>
          </button>

          <button
            type="button"
            className={`home-mode-card ${settings.homeMode === 'baby' || settings.hidePregnancy ? 'is-active' : ''}`}
            onClick={() =>
              patch({
                homeMode: 'baby',
                hidePregnancy: true,
                babyCareEnabled: true,
              })
            }
          >
            <span className="home-mode-icon">
              <Baby size={20} />
            </span>
            <div className="home-mode-info">
              <span className="home-mode-name">{t('settings.homeModeBaby')}</span>
              <span className="home-mode-desc">{t('settings.homeModeBabyDesc')}</span>
            </div>
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700 }}>{t('settings.babyProfiles')}</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0.2rem 0.65rem', minHeight: 30, fontSize: '0.82rem' }}
              onClick={() => setBabySheet(true)}
            >
              <Plus size={14} style={{ marginRight: 4 }} />
              {t('baby.add')}
            </button>
          </div>
          {babies.length > 0 ? (
            <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
              {babies.map((b) => (
                <li key={b.id}>
                  <strong>{b.name}</strong> · {formatBabyAge(b.birthDate, locale)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
              {t('settings.noBabiesHint')}
            </p>
          )}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <Timer size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('settings.laborRule')}
        </h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.laborHomeHint')}
        </p>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {(['auto', 'on', 'off'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`chip ${(settings.laborHomeMode ?? 'auto') === id ? 'active' : ''}`}
              onClick={() => patch({ laborHomeMode: id as LaborHomeMode })}
            >
              {id === 'auto'
                ? t('settings.laborHomeAuto')
                : id === 'on'
                  ? t('settings.laborHomeOn')
                  : t('settings.laborHomeOff')}
            </button>
          ))}
        </div>
        {(settings.laborHomeMode ?? 'auto') === 'auto' && (
          <div className="field">
            <label>{t('settings.laborHomeWeek')}</label>
            <input
              type="number"
              min={20}
              max={42}
              value={settings.laborHomeFromWeek ?? DEFAULT_LABOR_HOME_WEEK}
              onChange={(e) =>
                patch({ laborHomeFromWeek: Number(e.target.value) })
              }
            />
          </div>
        )}
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.laborRuleHint')}
        </p>
        <div className="chip-row">
          {(['511', '411', 'custom'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`chip ${(settings.laborRulePreset ?? '511') === id ? 'active' : ''}`}
              onClick={() => patch({ laborRulePreset: id })}
            >
              {id === '511'
                ? t('settings.laborRule511')
                : id === '411'
                  ? t('settings.laborRule411')
                  : t('settings.laborRuleCustom')}
            </button>
          ))}
        </div>
        {(settings.laborRulePreset ?? '511') === 'custom' && (
          <div className="labor-custom-fields">
            <div className="field">
              <label>{t('settings.laborInterval')}</label>
              <input
                type="number"
                min={2}
                max={15}
                value={laborRule.rule.intervalMinutes}
                onChange={(e) =>
                  patch({
                    laborRuleCustom: {
                      ...laborRule.rule,
                      intervalMinutes: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="field">
              <label>{t('settings.laborDuration')}</label>
              <input
                type="number"
                min={1}
                max={3}
                value={laborRule.rule.durationMinutes}
                onChange={(e) =>
                  patch({
                    laborRuleCustom: {
                      ...laborRule.rule,
                      durationMinutes: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="field">
              <label>{t('settings.laborSustained')}</label>
              <input
                type="number"
                min={20}
                max={180}
                value={laborRule.rule.sustainedMinutes}
                onChange={(e) =>
                  patch({
                    laborRuleCustom: {
                      ...laborRule.rule,
                      sustainedMinutes: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      </section>
        </div>
      </details>

      <details className="settings-fold span-2">
        <summary className="settings-fold-summary">{t('settings.groupAsk')}</summary>
        <div className="settings-fold-body">

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
        <h2 className="section-title">{t('settings.askContextTitle')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
          {t('settings.askContextHint')}
        </p>
        <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 10 }}>
          {t('settings.askContextEmpty')}
        </p>
        <div className="ask-context-groups">
          <div className="ask-context-group">
            <div className="ask-context-group-head">
              <div className="ask-context-group-title">
                <Baby size={16} />
                <strong>{t('settings.askContextBabyGroup')}</strong>
              </div>
              {homeMode === 'baby' ? (
                <span className="ask-active-tag">{t('settings.activeForCurrentMode')}</span>
              ) : (
                <span className="ask-inactive-tag muted">{t('settings.askContextBabyGroupDesc')}</span>
              )}
            </div>
            <div className="ask-context-list">
              {BABY_CONTEXT_KEYS.map((key) => {
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
          </div>

          <div className="ask-context-group">
            <div className="ask-context-group-head">
              <div className="ask-context-group-title">
                <HeartPulse size={16} />
                <strong>{t('settings.askContextPregnancyGroup')}</strong>
              </div>
              {homeMode === 'pregnancy' ? (
                <span className="ask-active-tag">{t('settings.activeForCurrentMode')}</span>
              ) : (
                <span className="ask-inactive-tag muted">{t('settings.askContextPregnancyGroupDesc')}</span>
              )}
            </div>
            <div className="ask-context-list">
              {PREGNANCY_CONTEXT_KEYS.map((key) => {
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
          </div>
        </div>
      </section>
        </div>
      </details>

      <details className="settings-fold span-2">
        <summary className="settings-fold-summary">{t('settings.groupNotify')}</summary>
        <div className="settings-fold-body">
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
        </div>
      </details>

      <details className="settings-fold span-2">
        <summary className="settings-fold-summary">{t('settings.groupData')}</summary>
        <div className="settings-fold-body">

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

        </div>
      </details>

      <p className="muted settings-version span-2">
        {t('settings.version', { v: APP_VERSION })}
      </p>

      {babySheet && (
        <BabyProfileSheet
          t={t}
          locale={settings.locale}
          onClose={() => setBabySheet(false)}
          onSave={(input) => {
            saveBaby(input);
            setBabySheet(false);
          }}
        />
      )}
    </div>
  );
}
