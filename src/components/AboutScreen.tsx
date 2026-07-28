import {
  ArrowLeft,
  Bug,
  Code2,
  ExternalLink,
  HardDrive,
  Heart,
  Scale,
  Shield,
  Tag,
} from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { PROJECT } from '../core/project';
import { APP_VERSION } from '../version';

const SUPPORT_IMG =
  'https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20pint&emoji=%F0%9F%8D%BA&slug=mingminghomework&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00';

type OssLink = {
  href: string;
  label: string;
  Icon: typeof Code2;
};

export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;

  const ossLinks: OssLink[] = [
    { href: PROJECT.repoUrl, label: t('about.linkSource'), Icon: Code2 },
    { href: PROJECT.licenseUrl, label: t('about.linkLicense'), Icon: Scale },
    { href: PROJECT.issuesUrl, label: t('about.linkIssues'), Icon: Bug },
    { href: PROJECT.releasesUrl, label: t('about.linkReleases'), Icon: Tag },
    {
      href: PROJECT.securityUrl,
      label: t('about.linkSecurity'),
      Icon: Shield,
    },
  ];

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

      {/* Product hero */}
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
            <div className="about-meta-row">
              <span className="about-chip">{t('settings.version', { v: APP_VERSION })}</span>
              <span className="about-chip about-chip-mit">{t('about.licenseShort')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* MIT / open source — standard OSS block */}
      <section className="card span-2">
        <h2 className="section-title">
          <Scale size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.openSourceTitle')}
        </h2>
        <p className="muted">{t('about.openSourceBody')}</p>
        <p className="about-copyright muted">
          {t('about.copyrightLine', {
            year: String(PROJECT.copyrightYear),
            name: PROJECT.copyrightHolder,
          })}
        </p>
        <p className="muted about-license-note">{t('about.licenseAsIs')}</p>
        <p className="about-repo-url">
          <a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">
            {PROJECT.repoLabel}
          </a>
        </p>
        <ul className="about-oss-links">
          {ossLinks.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-oss-link"
              >
                <span className="about-oss-link-left">
                  <Icon size={16} aria-hidden />
                  {label}
                </span>
                <ExternalLink size={14} className="muted" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
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

      <section className="card span-2 about-credits">
        <p className="about-credits-line">
          {t('about.createdBy')}{' '}
          <a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">
            {PROJECT.copyrightHolder}
          </a>
        </p>
        <p className="muted" style={{ marginTop: 6, fontSize: '0.82rem' }}>
          {t('about.contributionsWelcome')}
        </p>
        <p className="about-credits-pint">
          <a
            href={PROJECT.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('about.buyMeAPint')}
            style={{ display: 'inline-block', lineHeight: 0 }}
          >
            <img
              src={SUPPORT_IMG}
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
