import type { Locale } from '../types';
import type { AskContextBundle, AskContextFlags, AskContextKey } from './askContext';

export type WebAskPromptInput = {
  text: string;
  locale: Locale;
  pregnancyWeek?: number | null;
  context?: AskContextBundle;
  include?: AskContextFlags;
};

/** Labels for prompt context blocks (kept with code so prompt stays stable). */
const CONTEXT_LABELS: Record<
  AskContextKey,
  { en: string; zh: string }
> = {
  week: { en: 'Pregnancy progress', zh: '懷孕進度' },
  dueDate: { en: 'Due date', zh: '預產期' },
  medicines: {
    en: 'Medicines / supplements currently planned',
    zh: '目前用藥／保健品計畫',
  },
  takenToday: { en: 'Already taken today', zh: '今日已服用' },
  weight: { en: 'Latest weight', zh: '最近體重' },
  readings: { en: 'Other recent readings', zh: '其他最近數值' },
  appointments: { en: 'Upcoming appointments', zh: '即將到來的約會' },
};

function contextLines(
  locale: Locale,
  context: AskContextBundle | undefined,
  include: AskContextFlags | undefined
): string[] {
  if (!context || !include) return [];
  const isZh = locale === 'zh-Hant';
  const lines: string[] = [];

  for (const key of Object.keys(CONTEXT_LABELS) as AskContextKey[]) {
    if (!include[key]) continue;
    const v = context[key];
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (!Array.isArray(v) && !String(v).trim()) continue;
    const label = isZh ? CONTEXT_LABELS[key].zh : CONTEXT_LABELS[key].en;
    lines.push(
      Array.isArray(v) ? `${label}: ${v.join('; ')}` : `${label}: ${v}`
    );
  }
  return lines;
}

/** Build the pregnancy-safety prompt sent to Gemini / copy. */
export function buildWebAskPrompt(input: WebAskPromptInput): string {
  const lang = input.locale === 'zh-Hant' ? 'zh-Hant' : 'en';
  const extra = contextLines(input.locale, input.context, input.include);

  const weekFromFlag =
    input.include?.week && input.context?.week
      ? null
      : input.pregnancyWeek != null && input.include?.week !== false
        ? input.pregnancyWeek
        : input.pregnancyWeek != null && !input.include
          ? input.pregnancyWeek
          : null;

  if (lang === 'zh-Hant') {
    const parts = [
      '請以懷孕安全的角度，謹慎回答以下問題（非醫療建議；不確定時請偏向保守）。',
      '請用繁體中文回答。請分別標示「西醫」與「中醫」觀點的風險：綠／黃／紅，各附簡短說明（含食物、中藥、活動）。',
    ];
    if (weekFromFlag != null) {
      parts.push(`我大約懷孕第 ${weekFromFlag} 週。`);
    }
    if (extra.length) {
      parts.push(
        '',
        '我的相關資料（請一併考慮）：',
        ...extra.map((l) => `- ${l}`)
      );
    }
    parts.push('', `項目／問題：${input.text.trim()}`);
    return parts.join('\n');
  }

  const parts = [
    'Please answer carefully from a pregnancy-safety perspective (not medical advice; prefer caution when unsure).',
    'Reply in English. Give separate Western and Traditional Chinese medicine (TCM) risk labels GREEN / AMBER / RED with short notes (food, herbs, activity).',
  ];
  if (weekFromFlag != null) {
    parts.push(`I am around pregnancy week ${weekFromFlag}.`);
  }
  if (extra.length) {
    parts.push(
      '',
      'My relevant info (please take into account):',
      ...extra.map((l) => `- ${l}`)
    );
  }
  parts.push('', `Item / question: ${input.text.trim()}`);
  return parts.join('\n');
}
