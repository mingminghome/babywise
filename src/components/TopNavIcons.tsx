import { CircleHelp, Settings } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';
import { BuyMeAPint } from './BuyMeAPint';

/**
 * Compact icon nav (top-right) — web-friendly chrome for About / Settings.
 * Includes OriginWise-style “Buy me a pint” chip when env URL is set.
 */
export function TopNavIcons({
  tab,
  onChange,
  t,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
}) {
  const items: Array<{
    id: TabId;
    icon: typeof Settings;
    labelKey: string;
  }> = [
    { id: 'about', icon: CircleHelp, labelKey: 'tabs.about' },
    { id: 'settings', icon: Settings, labelKey: 'tabs.settings' },
  ];

  return (
    <div className="top-nav-right">
      <BuyMeAPint t={t} compact />
      <nav className="top-nav-icons" aria-label={t('tabs.navMore')}>
        {items.map(({ id, icon: Icon, labelKey }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              className={active ? 'top-nav-icon is-active' : 'top-nav-icon'}
              onClick={() => onChange(id)}
              aria-label={t(labelKey)}
              title={t(labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
