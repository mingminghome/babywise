import { CalendarDays, Home, MessageCircleQuestion, Settings } from 'lucide-react';
import type { TabId } from '../hooks/useAppState';
import type { TFunction } from '../core/i18n';

const items: Array<{ id: TabId; icon: typeof Home; labelKey: string }> = [
  { id: 'home', icon: Home, labelKey: 'tabs.home' },
  { id: 'calendar', icon: CalendarDays, labelKey: 'tabs.calendar' },
  { id: 'ask', icon: MessageCircleQuestion, labelKey: 'tabs.ask' },
  { id: 'settings', icon: Settings, labelKey: 'tabs.settings' },
];

export function BottomNav({
  tab,
  onChange,
  t,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ id, icon: Icon, labelKey }) => {
        const active = tab === id || (id === 'settings' && tab === 'about');
        return (
        <button
          key={id}
          type="button"
          className={active ? 'active' : undefined}
          onClick={() => onChange(id)}
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={active ? 2.4 : 2} />
          {t(labelKey)}
        </button>
        );
      })}
    </nav>
  );
}
