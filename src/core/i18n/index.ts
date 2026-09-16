import type { Locale } from '../types';
import { LOCALES } from '../types';
import { en, type MessageTree } from './en';
import { zhHant } from './zh-Hant';
import { europe } from './europe';

const catalogs: Record<Locale, MessageTree> = {
  en,
  'zh-Hant': zhHant,
  ...europe,
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-Hant': '繁體中文',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
};

const BCP47: Record<Locale, string> = {
  en: 'en',
  'zh-Hant': 'zh-Hant',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  nl: 'nl',
  pl: 'pl',
  sv: 'sv',
};

export const LOCALE_OPTIONS: Array<{ id: Locale; label: string }> = LOCALES.map(
  (id) => ({ id, label: LOCALE_LABELS[id] })
);

type Path = string;

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function createT(locale: Locale) {
  const tree = catalogs[locale] ?? en;
  return (key: Path, vars?: Record<string, string | number>): string => {
    const raw = getPath(tree, key) ?? getPath(en, key) ?? key;
    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{${name}}`
    );
  };
}

export type TFunction = ReturnType<typeof createT>;

export function localeTag(locale: Locale): string {
  return BCP47[locale] ?? 'en';
}

export function promptLanguageName(locale: Locale): string {
  switch (locale) {
    case 'zh-Hant':
      return 'Traditional Chinese (繁體中文)';
    case 'de':
      return 'German';
    case 'fr':
      return 'French';
    case 'es':
      return 'Spanish';
    case 'it':
      return 'Italian';
    case 'pt':
      return 'Portuguese';
    case 'nl':
      return 'Dutch';
    case 'pl':
      return 'Polish';
    case 'sv':
      return 'Swedish';
    default:
      return 'English';
  }
}

export { en, zhHant };
