import { Baby, CalendarDays, Home, MessageCircleQuestion, Wrench } from 'lucide-react';
import type { TabId } from '../hooks/useAppState';
import type { TFunction } from '../core/i18n';

type Props = {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
  showBaby?: boolean;
  isBabyMode?: boolean;
};

export function BottomNav({
  tab,
  onChange,
  t,
  showBaby = false,
  isBabyMode = false,
}: Props) {
  let items: Array<{ id: TabId; icon: typeof Home; labelKey: string }>;

  if (isBabyMode) {
    // In Baby Care Mode, Home is the baby dashboard.
    // Labor timer is irrelevant and retired from navigation.
    items = [
      { id: 'home', icon: Home, labelKey: 'tabs.home' },
      { id: 'calendar', icon: CalendarDays, labelKey: 'tabs.calendar' },
      { id: 'ask', icon: MessageCircleQuestion, labelKey: 'tabs.ask' },
    ];
  } else if (showBaby) {
    // Pregnancy mode with a baby profile:
    items = [
      { id: 'home', icon: Home, labelKey: 'tabs.home' },
      { id: 'calendar', icon: CalendarDays, labelKey: 'tabs.calendar' },
      { id: 'baby', icon: Baby, labelKey: 'tabs.baby' },
      { id: 'ask', icon: MessageCircleQuestion, labelKey: 'tabs.ask' },
    ];
  } else {
    // Standard pregnancy mode:
    items = [
      { id: 'home', icon: Home, labelKey: 'tabs.home' },
      { id: 'calendar', icon: CalendarDays, labelKey: 'tabs.calendar' },
      { id: 'tools', icon: Wrench, labelKey: 'tabs.tools' },
      { id: 'ask', icon: MessageCircleQuestion, labelKey: 'tabs.ask' },
    ];
  }

  const cols = items.length;

  return (
    <nav
      className={`bottom-nav is-${cols === 5 ? 'five' : cols === 4 ? 'four' : 'three'}`}
      aria-label="Main"
    >
      {items.map(({ id, icon: Icon, labelKey }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            className={active ? 'active' : undefined}
            onClick={() => onChange(id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span className="bottom-nav-label">{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
