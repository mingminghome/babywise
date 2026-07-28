import { MEDICINES } from '../../data/medicines';
import type { Locale, MedicineEntry } from '../types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function displayName(entry: MedicineEntry, locale: Locale): string {
  return locale === 'zh-Hant' ? entry.nameZh : entry.nameEn;
}

function scoreEntry(entry: MedicineEntry, q: string, locale: Locale): number {
  if (!q) return 0;
  const nq = normalize(q);
  const primary = normalize(displayName(entry, locale));
  const other = normalize(locale === 'zh-Hant' ? entry.nameEn : entry.nameZh);
  const aliases = entry.aliases.map(normalize);

  if (primary.startsWith(nq)) return 100;
  if (aliases.some((a) => a.startsWith(nq))) return 90;
  if (other.startsWith(nq)) return 80;
  if (primary.includes(nq)) return 70;
  if (aliases.some((a) => a.includes(nq))) return 60;
  if (other.includes(nq)) return 50;

  // initials / first letters of words (e.g. "ba" → baby aspirin)
  const words = primary.split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean);
  const initials = words.map((w) => w[0]).join('');
  if (initials.startsWith(nq)) return 85;

  return 0;
}

export function suggestMedicines(
  query: string,
  locale: Locale,
  limit = 8
): Array<MedicineEntry & { label: string }> {
  const q = query.trim();
  if (q.length < 1) return [];

  const scored = MEDICINES.map((entry) => ({
    entry,
    label: displayName(entry, locale),
    score: scoreEntry(entry, q, locale),
  }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry, label }) => ({ ...entry, label }));
}
