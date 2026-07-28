import type { CalendarEvent, EventType } from '../types';

function normTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)\s*$/, ''); // drop trailing (dose) for compare
}

/**
 * Find an existing medicine *plan* that looks like a duplicate of the one
 * being saved (same medicineKey or same title, different id).
 */
export function findDuplicateMedicinePlan(
  events: CalendarEvent[],
  opts: {
    editId?: string;
    type: EventType;
    title: string;
    medicineKey?: string;
  }
): CalendarEvent | null {
  if (opts.type !== 'medicine') return null;
  const title = normTitle(opts.title);
  if (!title && !opts.medicineKey) return null;

  for (const e of events) {
    if (e.type !== 'medicine') continue;
    if (opts.editId && e.id === opts.editId) continue;
    if (opts.medicineKey && e.medicineKey && opts.medicineKey === e.medicineKey) {
      return e;
    }
    if (title && normTitle(e.title) === title) return e;
  }
  return null;
}
