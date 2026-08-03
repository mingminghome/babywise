import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';
import { TopNavIcons } from './TopNavIcons';

/**
 * Shared shell chrome — logo + top-right nav (About / Settings / pint).
 * Rendered once in App so every tab has the same top bar height.
 */
export function AppHeader({
  tab,
  onChange,
  t,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
}) {
  return (
    <header className="app-header app-header-bar">
      <a
        href="#/"
        className="app-logo"
        onClick={(e) => {
          e.preventDefault();
          onChange('home');
        }}
        aria-label={t('appName')}
      >
        <img
          className="app-logo-mark"
          src="/logo-120.png"
          alt=""
          width={32}
          height={32}
          decoding="async"
        />
        <span className="app-logo-name">{t('appName')}</span>
      </a>
      <TopNavIcons tab={tab} onChange={onChange} t={t} />
    </header>
  );
}
