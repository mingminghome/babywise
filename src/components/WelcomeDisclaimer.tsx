import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Check,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { TFunction } from '../core/i18n';

type AcceptOpts = {
  notificationsEnabled: boolean;
};

type Props = {
  t: TFunction;
  onAccept: (opts: AcceptOpts) => void | Promise<void>;
};

/**
 * First-visit welcome: medical disclaimer, privacy, notifications.
 */
export function WelcomeDisclaimer({ t, onAccept }: Props) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAccept({ notificationsEnabled });
    } catch (err) {
      console.warn('Welcome accept failed:', err);
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="welcome-backdrop" role="presentation">
      <div
        className="welcome-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <div className="welcome-brand" aria-hidden>
          <span className="welcome-brand-icon">
            <HeartHandshake size={28} strokeWidth={1.75} />
          </span>
        </div>
        <h2 id="welcome-title" className="welcome-title">
          {t('welcome.title')}
        </h2>
        <p className="welcome-lead muted">{t('welcome.lead')}</p>

        <ul className="welcome-list">
          <li className="welcome-item">
            <span className="welcome-item-icon is-medical" aria-hidden>
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <div>
              <strong>{t('welcome.medicalTitle')}</strong>
              <p>{t('welcome.medicalBody')}</p>
            </div>
          </li>
          <li className="welcome-item">
            <span className="welcome-item-icon is-privacy" aria-hidden>
              <HeartHandshake size={18} strokeWidth={2} />
            </span>
            <div>
              <strong>{t('welcome.privacyTitle')}</strong>
              <p>{t('welcome.privacyBody')}</p>
            </div>
          </li>
          <li className="welcome-item">
            <span className="welcome-item-icon is-ask" aria-hidden>
              <Sparkles size={18} strokeWidth={2} />
            </span>
            <div>
              <strong>{t('welcome.askTitle')}</strong>
              <p>{t('welcome.askBody')}</p>
            </div>
          </li>
        </ul>

        <button
          type="button"
          className={`welcome-toggle-card ${notificationsEnabled ? 'is-on' : ''}`}
          role="switch"
          aria-checked={notificationsEnabled}
          onClick={() => setNotificationsEnabled((v) => !v)}
        >
          <span className="welcome-toggle-icon" aria-hidden>
            <Bell size={18} strokeWidth={2} />
          </span>
          <span className="welcome-toggle-copy">
            <span className="welcome-toggle-title">
              {t('welcome.notificationsLabel')}
            </span>
            <span className="welcome-toggle-hint">
              {t('welcome.notificationsHint')}
            </span>
          </span>
          <span className="welcome-switch" aria-hidden>
            <span className="welcome-switch-knob">
              {notificationsEnabled && <Check size={12} strokeWidth={3} />}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="btn btn-block btn-primary"
          disabled={busy}
          onClick={() => void finish()}
        >
          {t('welcome.accept')}
        </button>
      </div>
    </div>,
    document.body
  );
}
