import type { IndicatorKind, Locale } from '../types';

export type IndicatorMeta = {
  kind: IndicatorKind;
  defaultUnit: string;
  /** Needs two numeric fields (e.g. blood pressure). */
  dual?: boolean;
  secondaryUnit?: string;
};

export const INDICATORS: IndicatorMeta[] = [
  { kind: 'weight', defaultUnit: 'kg' },
  { kind: 'calories', defaultUnit: 'kcal' },
  { kind: 'blood_pressure', defaultUnit: 'mmHg', dual: true },
  { kind: 'heart_rate', defaultUnit: 'bpm' },
  { kind: 'blood_sugar', defaultUnit: 'mmol/L' },
  { kind: 'temperature', defaultUnit: '°C' },
  { kind: 'fundal_height', defaultUnit: 'cm' },
  { kind: 'kick_count', defaultUnit: 'kicks' },
  { kind: 'length', defaultUnit: 'cm' },
  { kind: 'head_circumference', defaultUnit: 'cm' },
  { kind: 'custom', defaultUnit: '' },
];

export function indicatorLabel(kind: IndicatorKind, locale: Locale): string {
  const zh = locale === 'zh-Hant';
  const map: Record<IndicatorKind, [string, string]> = {
    weight: ['Weight', '體重'],
    calories: ['Calories', '熱量'],
    blood_pressure: ['Blood pressure', '血壓'],
    heart_rate: ['Heart rate', '心率'],
    blood_sugar: ['Blood sugar', '血糖'],
    temperature: ['Temperature', '體溫'],
    fundal_height: ['Fundal height', '宮底高度'],
    kick_count: ['Kick count', '胎動次數'],
    length: ['Length', '身長'],
    head_circumference: ['Head circumference', '頭圍'],
    custom: ['Custom', '自訂'],
  };
  return zh ? map[kind][1] : map[kind][0];
}

/** Strip float noise (3.3150000000000004 → 3.315). */
export function formatReadingNumber(n: number, maxDecimals = 3): string {
  if (!Number.isFinite(n)) return '';
  const f = 10 ** maxDecimals;
  const rounded = Math.round((n + Number.EPSILON) * f) / f;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function roundReading(n: number, maxDecimals = 3): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** maxDecimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function formatIndicatorDisplay(
  kind: IndicatorKind,
  value: number,
  unit: string,
  locale: Locale,
  valueSecondary?: number,
  customLabel?: string
): string {
  const name =
    kind === 'custom' && customLabel?.trim()
      ? customLabel.trim()
      : indicatorLabel(kind, locale);
  if (kind === 'blood_pressure' && valueSecondary != null) {
    return `${name} ${formatReadingNumber(value)}/${formatReadingNumber(valueSecondary)} ${unit}`.trim();
  }
  return `${name} ${formatReadingNumber(value)}${unit ? ` ${unit}` : ''}`.trim();
}

export function getIndicatorMeta(kind: IndicatorKind): IndicatorMeta {
  return INDICATORS.find((i) => i.kind === kind) ?? INDICATORS[INDICATORS.length - 1];
}
