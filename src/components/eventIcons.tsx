import {
  Activity,
  Bell,
  CalendarClock,
  CheckCircle2,
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
};

export function eventTypeIcon(type: EventType): LucideIcon {
  return ICONS[type] ?? StickyNote;
}
