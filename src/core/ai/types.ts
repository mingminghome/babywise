import type { AiProviderId, SafetyResult } from '../types';

/** Optional photo attached to Ask (base64, no data: prefix). */
export type AskImagePayload = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
};

export type AskRequest = {
  locale: string;
  pregnancyWeek?: number | null;
  text?: string;
  /** Optional short context from local calendar (server-capped) */
  contextNotes?: string;
  /** Server AI family: gemini | openai | grok | claude */
  provider?: AiProviderId;
  /** Optional photo (label / product / food). Compressed client-side. */
  image?: AskImagePayload;
};

export type AskResponse =
  | { ok: true; result: SafetyResult; provider?: AiProviderId }
  | { ok: false; error: string; code?: string };
