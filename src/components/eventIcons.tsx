import {
  Activity,
  Bell,
  CalendarClock,
  CheckCircle2,
  CloudDrizzle,
  Droplet,
  Droplets,
  Milk,
  Moon,
  PersonStanding,
  Pill,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import type { EventType } from '../core/types';

const ICONS: Record<EventType, LucideIcon> = {
  medicine: Pill,
  medicine_log: CheckCircle2,
  appointment: CalendarClock,
  reminder: Bell,
  indicator: Activity,
  note: StickyNote,
  feed: Milk,
  diaper: Droplets,
  sleep: Moon,
  pump: Droplet,
  tummy: PersonStanding,
  spitup: CloudDrizzle,
};

export function eventTypeIcon(type: EventType): LucideIcon {
  return ICONS[type] ?? StickyNote;
}

/** Quick-log glyph: appointment is today’s date; others are a larger lucide icon, no chip frame. */
export function QuickLogGlyph({ type }: { type: EventType }) {
  if (type === 'appointment') {
    return (
      <span className="quick-log-icon is-appointment is-date" aria-hidden>
        {new Date().getDate()}
      </span>
    );
  }
  const Icon = eventTypeIcon(type);
  return (
    <span className={`quick-log-icon is-${type}`} aria-hidden>
      <Icon size={26} strokeWidth={2.05} />
    </span>
  );
}
