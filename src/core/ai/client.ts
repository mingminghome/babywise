import { extractSafetyResult } from './extract';
import type { AskRequest, AskResponse, RateLimitMeta } from './types';
import { AI_PROVIDERS, type AiProviderId } from '../types';

function parseRateLimitMeta(
  data: Record<string, unknown>,
  res?: Response
): RateLimitMeta | undefined {
  const fromBody =
    data.limit != null || data.window != null || data.retryAfterSec != null
      ? {
          limit: typeof data.limit === 'number' ? data.limit : undefined,
          window: typeof data.window === 'string' ? data.window : undefined,
          windowSec:
            typeof data.windowSec === 'number' ? data.windowSec : undefined,
          retryAfterSec:
            typeof data.retryAfterSec === 'number'
              ? data.retryAfterSec
              : undefined,
        }
      : undefined;
  if (fromBody) return fromBody;
  const header = res?.headers.get('Retry-After');
  if (header) {
    const n = parseInt(header, 10);
    if (Number.isFinite(n) && n > 0) return { retryAfterSec: n };
  }
  return undefined;
}

const base =
  (import.meta.env.VITE_ASK_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  '/api/ask';

export type AskProvidersStatus = {
  ok: boolean;
  providers: AiProviderId[];
  available: AiProviderId[];
  default: AiProviderId;
};

function isProviderId(v: unknown): v is AiProviderId {
  return typeof v === 'string' && (AI_PROVIDERS as readonly string[]).includes(v);
}

/** GET /api/ask — which providers have server keys (no secrets). */
export async function fetchAskProviders(): Promise<AskProvidersStatus | null> {
  try {
    const res = await fetch(base, { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      providers?: unknown;
      available?: unknown;
      default?: unknown;
    };
    const providers = Array.isArray(data.providers)
      ? data.providers.filter(isProviderId)
      : [...AI_PROVIDERS];
    const available = Array.isArray(data.available)
      ? data.available.filter(isProviderId)
      : [];
    const def = isProviderId(data.default) ? data.default : 'gemini';
    return {
      ok: data.ok !== false,
      providers: providers.length ? providers : [...AI_PROVIDERS],
      available,
      default: def,
    };
  } catch {
    return null;
  }
}

/** Call /api/ask (server API keys). Prompt is built on the server. */
export async function askSafety(req: AskRequest): Promise<AskResponse> {
  try {
    const body: Record<string, unknown> = {
      locale: req.locale,
      pregnancyWeek: req.pregnancyWeek,
      text: req.text,
      contextNotes: req.contextNotes,
      provider: req.provider ?? 'gemini',
    };
    if (req.image?.data && req.image.mimeType) {
      body.image = {
        mimeType: req.image.mimeType,
        data: req.image.data,
      };
    }
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AskResponse & {
      error?: string;
      code?: string;
      rawText?: string;
      provider?: AiProviderId;
      result?: AskResponse extends { ok: true; result: infer R } ? R : never;
      limit?: number;
      window?: string;
      windowSec?: number;
      retryAfterSec?: number;
    };
    const rateLimit = parseRateLimitMeta(
      data as unknown as Record<string, unknown>,
      res
    );

    if (!res.ok) {
      if (data.rawText) {
        const extracted = extractSafetyResult(data.rawText, req.locale);
        if (extracted)
          return {
            ok: true,
            result: extracted,
            provider: data.provider ?? req.provider,
          };
      }
      return {
        ok: false,
        error: data.error || `HTTP ${res.status}`,
        code: data.code,
        rateLimit,
      };
    }
    if ('ok' in data && data.ok === false) {
      if (data.rawText) {
        const extracted = extractSafetyResult(data.rawText, req.locale);
        if (extracted)
          return {
            ok: true,
            result: extracted,
            provider: data.provider ?? req.provider,
          };
      }
      return {
        ok: false,
        error: data.error || 'Ask failed',
        code: data.code,
        rateLimit,
      };
    }
    if ('result' in data && data.result) {
      return {
        ok: true,
        result: data.result,
        provider: data.provider ?? req.provider,
      };
    }
    if (data.rawText) {
      const extracted = extractSafetyResult(data.rawText, req.locale);
      if (extracted)
        return {
          ok: true,
          result: extracted,
          provider: data.provider ?? req.provider,
        };
    }
    return { ok: false, error: 'Invalid response' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}
