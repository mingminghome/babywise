import type { Locale } from '../types';
import type { AskContextBundle, AskContextFlags, AskContextKey } from './askContext';

export type WebAskPromptInput = {
  text: string;
  locale: Locale;
  mode?: 'pregnancy' | 'baby';
  babyName?: string;
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
  babyAge: { en: 'Baby profile', zh: '寶寶月齡與資料' },
  babyFeeds: { en: 'Today’s feeds', zh: '今日餵奶' },
  babyDiapers: { en: 'Today’s diapers', zh: '今日尿布' },
  babySleep: { en: 'Today’s sleep', zh: '今日睡眠' },
  babyWeight: { en: 'Baby weight', zh: '寶寶體重' },
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

/** Build the prompt sent to AI (tailored to baby care vs pregnancy). */
export function buildWebAskPrompt(input: WebAskPromptInput): string {
  const isZh = input.locale === 'zh-Hant';
  const isBabyMode = input.mode === 'baby';
  const extra = contextLines(input.locale, input.context, input.include);

  if (isZh) {
    if (isBabyMode) {
      const parts = [
        '請以新生兒與嬰幼兒照護、發育安全，或產後哺乳／母乳安全、嬰兒副食品、嬰兒異常症狀的角度，謹慎回答以下問題（非醫療建議、不診斷；不確定時請偏向保守）。',
        '請用繁體中文回答。請分別標示「西方兒科醫學」與「中醫」觀點的風險評估或實用建議：綠／黃／紅，各附簡短說明（含餵食、睡眠、活動、用藥、環境、症狀）。若是嬰兒症狀（如發燒、呼吸異狀、皮疹、活動力差、嘔吐腹瀉），請明確對比常見居家觀察特徵與需立即就醫的危險警訊，並給出保守就醫指引。',
      ];
      if (input.context?.babyAge) {
        parts.push(`諮詢對象：${input.context.babyAge}`);
      } else if (input.babyName) {
        parts.push(`諮詢對象：寶寶 ${input.babyName}`);
      }
      if (extra.length) {
        parts.push(
          '',
          '目前寶寶生理與照護數據（請一併考慮）：',
          ...extra.map((l) => `- ${l}`)
        );
      }
      parts.push('', `項目／問題：${input.text.trim()}`);
      return parts.join('\n');
    }

    // Pregnancy Mode
    const weekFromFlag =
      input.include?.week && input.context?.week
        ? null
        : input.pregnancyWeek != null && input.include?.week !== false
          ? input.pregnancyWeek
          : input.pregnancyWeek != null && !input.include
            ? input.pregnancyWeek
            : null;

    const parts = [
      '請以懷孕母體安全、胎兒發育，或孕期症狀／擔心的角度，謹慎回答以下問題（非醫療建議、不診斷；不確定時請偏向保守）。',
      '請用繁體中文回答。請分別標示「西醫」與「中醫」觀點的風險：綠／黃／紅，各附簡短說明（含食物、中藥、活動、環境、症狀）。若是症狀，請說明常見與需就醫的差別，並給保守建議。',
    ];
    if (weekFromFlag != null) {
      parts.push(`我大約懷孕第 ${weekFromFlag} 週。`);
    }
    if (extra.length) {
      parts.push(
        '',
        '我的相關生理資料（請一併考慮）：',
        ...extra.map((l) => `- ${l}`)
      );
    }
    parts.push('', `項目／問題：${input.text.trim()}`);
    return parts.join('\n');
  }

  // English & Other Languages
  const langName =
    input.locale === 'de'
      ? 'German'
      : input.locale === 'fr'
        ? 'French'
        : input.locale === 'es'
          ? 'Spanish'
          : input.locale === 'it'
            ? 'Italian'
            : input.locale === 'pt'
              ? 'Portuguese'
              : input.locale === 'nl'
                ? 'Dutch'
                : input.locale === 'pl'
                  ? 'Polish'
                  : input.locale === 'sv'
                    ? 'Swedish'
                    : 'English';

  if (isBabyMode) {
    const parts = [
      'Please answer carefully from an infant / newborn care, pediatric safety, baby development, and postpartum/lactation perspective (not medical advice; do not diagnose; prefer caution when unsure).',
      `Reply in ${langName}. Give separate Western pediatric and Traditional Chinese medicine (TCM) risk labels GREEN / AMBER / RED with short practical guidance (feeding, sleep, soothing, medications, activity, symptoms). For infant symptoms (such as fever, breathing issues, lethargy, rash, or stool/feeding changes), contrast typical home observations with red-flag emergency signs, and advise when to contact a pediatrician.`,
    ];
    if (input.context?.babyAge) {
      parts.push(`Subject: ${input.context.babyAge}`);
    } else if (input.babyName) {
      parts.push(`Subject: Baby ${input.babyName}`);
    }
    if (extra.length) {
      parts.push(
        '',
        'Relevant baby care data (please take into account):',
        ...extra.map((l) => `- ${l}`)
      );
    }
    parts.push('', `Item / question: ${input.text.trim()}`);
    return parts.join('\n');
  }

  // Pregnancy Mode
  const weekFromFlag =
    input.include?.week && input.context?.week
      ? null
      : input.pregnancyWeek != null && input.include?.week !== false
        ? input.pregnancyWeek
        : input.pregnancyWeek != null && !input.include
          ? input.pregnancyWeek
          : null;

  const parts = [
    'Please answer carefully from a pregnancy-safety, fetal health, and maternal symptom/worry perspective (not medical advice; do not diagnose; prefer caution when unsure).',
    `Reply in ${langName}. Give separate Western and Traditional Chinese medicine (TCM) risk labels GREEN / AMBER / RED with short notes (food, herbs, activity, symptoms). For symptoms, contrast typical vs concerning features and give conservative suggestions plus when to contact a clinician.`,
  ];
  if (weekFromFlag != null) {
    parts.push(`I am around pregnancy week ${weekFromFlag}.`);
  }
  if (extra.length) {
    parts.push(
      '',
      'My relevant pregnancy info (please take into account):',
      ...extra.map((l) => `- ${l}`)
    );
  }
  parts.push('', `Item / question: ${input.text.trim()}`);
  return parts.join('\n');
}
