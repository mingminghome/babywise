import { getEvents, saveEvents } from '../storage/store';
import type { CalendarEvent, CompletionKind } from '../types';

function uid(): string {
  return crypto.randomUUID();
}

export function listEvents(): CalendarEvent[] {
  return getEvents().sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
}

export function upsertEvent(
  input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): CalendarEvent {
  const events = getEvents();
  const now = new Date().toISOString();
  if (input.id) {
    const idx = events.findIndex((e) => e.id === input.id);
    if (idx >= 0) {
      const updated: CalendarEvent = {
        ...events[idx],
        ...input,
        id: input.id,
        createdAt: events[idx].createdAt,
        updatedAt: now,
      };
      events[idx] = updated;
      saveEvents(events);
      return updated;
    }
  }
  const created: CalendarEvent = {
    ...input,
    id: input.id ?? uid(),
    createdAt: now,
    updatedAt: now,
  };
  events.push(created);
  saveEvents(events);
  return created;
}

export function deleteEvent(id: string): void {
  saveEvents(getEvents().filter((e) => e.id !== id));
}

/** Mark item taken / done / present for a calendar day (or clear). */
export function setEventCompletion(
  id: string,
  dateIso: string,
  kind: CompletionKind | null
): CalendarEvent | null {
  const events = getEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const prev = events[idx];
  const completions = { ...prev.completions };
  if (kind == null) {
    delete completions[dateIso];
  } else {
    completions[dateIso] = kind;
  }
  const updated: CalendarEvent = {
    ...prev,
    completions:
      Object.keys(completions).length > 0 ? completions : undefined,
    updatedAt: new Date().toISOString(),
  };
  events[idx] = updated;
  saveEvents(events);
  return updated;
}

export function getCompletion(
  event: CalendarEvent,
  dateIso: string
): CompletionKind | undefined {
  return event.completions?.[dateIso];
}
