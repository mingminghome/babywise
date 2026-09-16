import type {
  AppSettings,
  Contraction,
  GestationalAge,
  LaborHomeMode,
  LaborRule,
  LaborRulePreset,
  LaborSession,
} from '../types';
import { DEFAULT_LABOR_HOME_WEEK } from '../types';

export const LABOR_PRESET_RULES: Record<
  Exclude<LaborRulePreset, 'custom'>,
  LaborRule
> = {
  '511': { intervalMinutes: 5, durationMinutes: 1, sustainedMinutes: 60 },
  '411': { intervalMinutes: 4, durationMinutes: 1, sustainedMinutes: 60 },
};

export const DEFAULT_LABOR_RULE: LaborRule = LABOR_PRESET_RULES['511'];

export function clampLaborHomeWeek(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LABOR_HOME_WEEK;
  return Math.min(42, Math.max(20, Math.round(n)));
}

export function resolveLaborHomeMode(raw: unknown): LaborHomeMode {
  const s = String(raw ?? '');
  if (s === 'on' || s === 'off' || s === 'auto') return s;
  return 'auto';
}

/** Home labor card: in-progress session always; else follow Settings. */
export function shouldShowLaborOnHome(opts: {
  mode?: LaborHomeMode;
  fromWeek?: number;
  ga: GestationalAge | null;
  hasOpenSession: boolean;
  hasProfile: boolean;
}): boolean {
  if (opts.hasOpenSession) return true;
  if (!opts.hasProfile) return false;
  const mode = opts.mode ?? 'auto';
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  const from = clampLaborHomeWeek(opts.fromWeek);
  const weeks = opts.ga && opts.ga.isValid ? opts.ga.weeks : null;
  return weeks != null && weeks >= from;
}

export function clampLaborRule(rule: Partial<LaborRule> | null | undefined): LaborRule {
  const interval = Number(rule?.intervalMinutes);
  const duration = Number(rule?.durationMinutes);
  const sustained = Number(rule?.sustainedMinutes);
  return {
    intervalMinutes: clampInt(interval, 2, 15, 5),
    durationMinutes: clampInt(duration, 1, 3, 1),
    sustainedMinutes: clampInt(sustained, 20, 180, 60),
  };
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function resolveLaborRule(settings: AppSettings): {
  preset: LaborRulePreset;
  rule: LaborRule;
} {
  const preset = settings.laborRulePreset ?? '511';
  if (preset === 'custom') {
    return { preset, rule: clampLaborRule(settings.laborRuleCustom) };
  }
  if (preset === '411') {
    return { preset, rule: LABOR_PRESET_RULES['411'] };
  }
  return { preset: '511', rule: LABOR_PRESET_RULES['511'] };
}

export function contractionDurationSec(
  c: Contraction,
  now = Date.now()
): number | null {
  const start = Date.parse(c.startAt);
  if (!Number.isFinite(start)) return null;
  const end = c.endAt ? Date.parse(c.endAt) : now;
  if (!Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

export function contractionIntervalSec(
  prev: Contraction,
  next: Contraction
): number | null {
  const a = Date.parse(prev.startAt);
  const b = Date.parse(next.startAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 1000);
}

export type LaborPatternStatus = 'idle' | 'tracking' | 'approaching' | 'met';

export type LaborPattern = {
  status: LaborPatternStatus;
  avgIntervalSec: number | null;
  avgDurationSec: number | null;
  countInWindow: number;
  completedCount: number;
};

export function evaluateLaborRule(
  contractions: Contraction[],
  rule: LaborRule,
  now = new Date()
): LaborPattern {
  const completed = contractions
    .filter((c) => c.endAt)
    .toSorted((a, b) => a.startAt.localeCompare(b.startAt));

  const windowMs = rule.sustainedMinutes * 60_000;
  const windowStart = now.getTime() - windowMs;
  const inWindow = completed.filter((c) => {
    const t = Date.parse(c.startAt);
    return Number.isFinite(t) && t >= windowStart;
  });

  const durations = inWindow
    .map((c) => contractionDurationSec(c, now.getTime()))
    .filter((n): n is number => n != null);
  const avgDurationSec = avg(durations);

  const intervals: number[] = [];
  for (let i = 1; i < inWindow.length; i++) {
    const iv = contractionIntervalSec(inWindow[i - 1]!, inWindow[i]!);
    if (iv != null) intervals.push(iv);
  }
  const avgIntervalSec = avg(intervals);

  const needDuration = rule.durationMinutes * 60;
  const needInterval = rule.intervalMinutes * 60;

  let status: LaborPatternStatus = completed.length ? 'tracking' : 'idle';
  if (
    inWindow.length >= 3 &&
    avgDurationSec != null &&
    avgIntervalSec != null
  ) {
    const span =
      Date.parse(inWindow[inWindow.length - 1]!.startAt) -
      Date.parse(inWindow[0]!.startAt);
    const durOk = avgDurationSec >= needDuration * 0.85;
    const intOk = avgIntervalSec <= needInterval * 1.2;
    if (
      avgDurationSec >= needDuration &&
      avgIntervalSec <= needInterval &&
      span >= windowMs * 0.75
    ) {
      status = 'met';
    } else if (durOk && intOk && span >= windowMs * 0.4) {
      status = 'approaching';
    }
  }

  return {
    status,
    avgIntervalSec,
    avgDurationSec,
    countInWindow: inWindow.length,
    completedCount: completed.length,
  };
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function formatIntervalLabel(totalSec: number, zh: boolean): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (zh) {
    return r === 0 ? `${m} 分` : `${m} 分 ${r} 秒`;
  }
  return r === 0 ? `${m} min` : `${m} min ${r}s`;
}

export function openLaborSession(
  sessions: LaborSession[]
): LaborSession | null {
  const open = sessions
    .filter((s) => !s.endedAt)
    .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt));
  return open[0] ?? null;
}

export function ongoingContraction(
  session: LaborSession | null
): Contraction | null {
  if (!session) return null;
  const open = session.contractions
    .filter((c) => !c.endAt)
    .toSorted((a, b) => b.startAt.localeCompare(a.startAt));
  return open[0] ?? null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Unlinked labor closest to a birth date (within 3 days), preferring
 * an in-progress session.
 */
export function laborToAttach(
  sessions: LaborSession[],
  birthDate: string
): LaborSession | null {
  const birth = Date.parse(`${birthDate}T12:00:00`);
  if (!Number.isFinite(birth)) return null;
  const nearby = sessions.filter((s) => {
    if (s.babyId) return false;
    const t = Date.parse(s.startedAt);
    return Number.isFinite(t) && Math.abs(t - birth) <= THREE_DAYS_MS;
  });
  if (!nearby.length) return null;
  const open = nearby.find((s) => !s.endedAt);
  if (open) return open;
  return nearby.toSorted((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

export function formatLaborSessionText(
  session: LaborSession,
  opts: { zh: boolean; babyName?: string }
): string {
  const { zh, babyName } = opts;
  const start = new Date(session.startedAt);
  const when = Number.isNaN(start.getTime())
    ? session.startedAt
    : start.toLocaleString(zh ? 'zh-Hant' : 'en', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  const completed = session.contractions
    .filter((c) => c.endAt)
    .toSorted((a, b) => a.startAt.localeCompare(b.startAt));
  const pattern = evaluateLaborRule(session.contractions, session.rule);
  const lines: string[] = [
    zh ? `BabyWise 宮縮 · ${when}` : `BabyWise labor · ${when}`,
  ];
  if (babyName) {
    lines.push(zh ? `寶寶：${babyName}` : `Baby: ${babyName}`);
  }
  lines.push(
    zh
      ? `規則 ${session.rule.intervalMinutes}-${session.rule.durationMinutes}-${session.rule.sustainedMinutes}`
      : `Rule ${session.rule.intervalMinutes}-${session.rule.durationMinutes}-${session.rule.sustainedMinutes}`
  );
  lines.push(
    zh ? `共 ${completed.length} 波` : `${completed.length} contractions`
  );
  if (pattern.avgDurationSec != null) {
    lines.push(
      zh
        ? `平均持續 ${formatMmSs(pattern.avgDurationSec)}`
        : `Avg duration ${formatMmSs(pattern.avgDurationSec)}`
    );
  }
  if (pattern.avgIntervalSec != null) {
    lines.push(
      zh
        ? `平均間隔 ${formatIntervalLabel(pattern.avgIntervalSec, true)}`
        : `Avg interval ${formatIntervalLabel(pattern.avgIntervalSec, false)}`
    );
  }
  if (pattern.status === 'met') {
    lines.push(
      zh ? '型態：已達你設定的規則（非醫療建議）' : 'Pattern: chosen rule looks met (not medical advice)'
    );
  }
  lines.push('');
  for (const c of completed) {
    const dur = contractionDurationSec(c) ?? 0;
    const clock = new Date(c.startAt).toLocaleTimeString(zh ? 'zh-Hant' : 'en', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const intensity =
      c.intensity != null ? (zh ? ` 強度${c.intensity}` : ` intensity ${c.intensity}`) : '';
    lines.push(`• ${clock} · ${formatMmSs(dur)}${intensity}`);
  }
  lines.push('');
  lines.push(
    zh
      ? '這是日記紀錄，不是診斷。'
      : 'This is a diary log, not a diagnosis.'
  );
  return `${lines.join('\n')}\n`;
}
