/**
 * Ask helpers for BabyWise
 * Worker server keys → selected provider → parse badges
 */

import type { AiProviderId, Locale, SafetyResult } from '../types';
import type { AskContextBundle, AskContextFlags } from './askContext';
import { askSafety } from './client';
import type { AskImagePayload } from './types';
import { buildWebAskPrompt } from './webAsk';

export type EngineInput = {
  question: string;
  locale: Locale;
  pregnancyWeek?: number | null;
  context?: AskContextBundle;
  include?: AskContextFlags;
  provider?: AiProviderId;
  /** Optional compressed photo for multimodal Ask */
  image?: AskImagePayload;
};

export type EngineResult =
  | {
      ok: true;
      result: SafetyResult;
      prompt: string;
      provider?: AiProviderId;
      rawText?: string;
    }
  | { ok: false; error: string; prompt: string; code?: string };

export function engineBuildPrompt(input: EngineInput): string {
  return buildWebAskPrompt({
    text: input.question,
    locale: input.locale,
    pregnancyWeek: input.pregnancyWeek,
    context: input.context,
    include: input.include,
  });
}

/** Compact context string for the Worker (not a full system prompt). */
function buildContextNotes(input: EngineInput): string {
  const full = engineBuildPrompt(input);
  const lines = full.split('\n');
  const bullets = lines
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
  return bullets.join('\n').slice(0, 600);
}

/** In-app answer via Worker + selected AI provider. */
export async function engineRunAsk(input: EngineInput): Promise<EngineResult> {
  const prompt = engineBuildPrompt(input);
  const text = input.question.trim().slice(0, 400);
  const hasImage = Boolean(input.image?.data);
  if (!text && !hasImage) {
    return { ok: false, error: 'empty', prompt, code: 'empty' };
  }

  const provider = input.provider ?? 'gemini';
  const res = await askSafety({
    locale: input.locale,
    pregnancyWeek: input.pregnancyWeek,
    text: text || undefined,
    contextNotes: buildContextNotes(input) || undefined,
    provider,
    image: hasImage ? input.image : undefined,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      prompt,
      code: res.code,
    };
  }
  return {
    ok: true,
    result: res.result,
    prompt,
    provider: res.provider ?? provider,
  };
}
