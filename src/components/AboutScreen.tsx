import { ArrowLeft, Code2, Heart, HardDrive, Scale, Shield } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';

const GITHUB_URL = 'https://github.com/mingminghome/babywise';
const BUY_ME_A_PINT_URL = 'https://buymeacoffee.com/mingminghomework';
const BUY_ME_A_PINT_IMG =
  'https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20pint&emoji=%F0%9F%8D%BA&slug=mingminghomework&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00';

export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;

  return (
    <div className="layout-grid">
      <header className="app-header span-2">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
          <button
            type="button"
            className="about-back"
            aria-label={t('about.back')}
            onClick={() => setTab('settings')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{t('about.title')}</h1>
            <p className="subtitle">{t('about.tagline')}</p>
          </div>
        </div>
      </header>

      <section className="card span-2">
        <div className="about-hero">
          <div className="about-hero-icon" aria-hidden>
            <Heart size={28} />
          </div>
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              {t('appName')}
            </h2>
            <p className="muted">{t('about.intro')}</p>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
              {t('settings.version', { v: APP_VERSION })}
              {' · '}
              {t('about.licenseShort')}
            </p>
            <p className="about-repo-line">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                {t('about.repoLink')}
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <Shield size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.privacyTitle')}
        </h2>
        <p className="muted">{t('about.privacyLead')}</p>
        <ul className="about-list muted">
          <li>{t('about.privacyBullet1')}</li>
          <li>{t('about.privacyBullet2')}</li>
          <li>{t('about.privacyBullet3')}</li>
          <li>{t('about.privacyBullet4')}</li>
          <li>{t('about.privacyBullet5')}</li>
        </ul>
        <p className="about-legal-links muted">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
            {t('about.privacyPolicyLink')}
          </a>
          <span aria-hidden> · </span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">
            {t('about.termsLink')}
          </a>
        </p>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <HardDrive size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.designTitle')}
        </h2>
        <p className="muted">{t('about.designLead')}</p>

        <div className="about-design-block">
          <h3 className="about-h3">
            <HardDrive size={14} /> {t('about.designLocalTitle')}
          </h3>
          <p className="muted">{t('about.designLocalBody')}</p>
        </div>

        <div className="about-design-block">
          <h3 className="about-h3">{t('about.designWhyTitle')}</h3>
          <ul className="about-list muted">
            <li>{t('about.designWhy1')}</li>
            <li>{t('about.designWhy2')}</li>
            <li>{t('about.designWhy3')}</li>
          </ul>
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('about.disclaimerTitle')}</h2>
        <p className="muted">{t('about.disclaimerBody')}</p>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <Code2 size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.openSourceTitle')}
        </h2>
        <p className="muted">{t('about.openSourceBody')}</p>
        <p className="about-repo-url">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            github.com/mingminghome/babywise
          </a>
        </p>
        <p className="about-legal-links muted" style={{ marginTop: 10 }}>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t('about.sourceCode')}
          </a>
          <span aria-hidden> · </span>
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Scale size={12} style={{ verticalAlign: -1, marginRight: 3 }} />
            {t('about.licenseMit')}
          </a>
          <span aria-hidden> · </span>
          <a
            href={`${GITHUB_URL}/blob/main/SECURITY.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('about.securityLink')}
          </a>
        </p>
      </section>

      <section className="card span-2 about-credits">
        <p className="about-credits-line">
          {t('about.createdBy')}{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            MingMingHomeWork
          </a>
        </p>
        <p className="about-repo-line" style={{ marginTop: 6 }}>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {GITHUB_URL.replace(/^https:\/\//, '')}
          </a>
        </p>
        <p className="about-credits-pint">
          <a
            href={BUY_ME_A_PINT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('about.buyMeAPint')}
            style={{ display: 'inline-block', lineHeight: 0 }}
          >
            <img
              src={BUY_ME_A_PINT_IMG}
              alt={t('about.buyMeAPint')}
              height={40}
              style={{ height: 40, width: 'auto', border: 0 }}
            />
          </a>
        </p>
      </section>
    </div>
  );
}
