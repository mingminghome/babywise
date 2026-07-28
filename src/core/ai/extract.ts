import type {
  SafetyItem,
  SafetyPerspective,
  SafetyResult,
  SafetyTier,
} from '../types';

const TIERS: SafetyTier[] = ['green', 'amber', 'red', 'unknown'];

/** Lower = more cautious (for sorting multi-item lists). */
export function tierSeverity(tier: SafetyTier): number {
  if (tier === 'red') return 0;
  if (tier === 'amber') return 1;
  if (tier === 'unknown') return 2;
  return 3;
}

function asTier(raw: unknown): SafetyTier {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (TIERS.includes(s as SafetyTier)) return s as SafetyTier;
  // Free-text labels from models / web paste
  if (/綠|green|safe|lower concern|generally ok|通常較安全|風險較低/.test(s))
    return 'green';
  if (/黃|amber|orange|caution|careful|謹慎|視情況|有限/.test(s)) return 'amber';
  if (/紅|red|avoid|危險|避免|seek care|就醫|不宜/.test(s)) return 'red';
  return 'unknown';
}

function asPerspective(raw: unknown): SafetyPerspective | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    return { tier: asTier(raw) };
  }
  if (typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const summary = String(obj.summary ?? obj.note ?? obj.text ?? '').trim();
  return {
    tier: asTier(obj.tier ?? obj.level ?? obj.risk ?? raw),
    summary: summary ? summary.slice(0, 400) : undefined,
  };
}

function asItem(raw: unknown): SafetyItem | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? o.title ?? o.item ?? o.ingredient ?? '')
    .trim()
    .slice(0, 80);
  if (!name) return null;
  const western = asPerspective(o.western ?? o.westernMedicine);
  const tcm = asPerspective(o.tcm ?? o.chineseMedicine ?? o.cm);
  const tier = asTier(
    o.tier ?? o.level ?? o.risk ?? western?.tier ?? tcm?.tier
  );
  const note = String(o.note ?? o.summary ?? '').trim().slice(0, 280);
  return {
    name,
    tier,
    western: western ?? { tier },
    tcm: tcm ?? { tier: 'unknown' },
    note: note || undefined,
  };
}

function parseItems(raw: unknown): SafetyItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map(asItem)
    .filter((x): x is SafetyItem => Boolean(x))
    .slice(0, 12)
    .sort((a, b) => tierSeverity(a.tier) - tierSeverity(b.tier));
  return items.length ? items : undefined;
}

/**
 * Extract a structured SafetyResult from model output (JSON preferred,
 * with free-text fallback so we can still show badges).
 */
export function extractSafetyResult(
  text: string,
  locale: string
): SafetyResult | null {
  if (!text?.trim()) return null;

  // 1) Prefer JSON object
  try {
    const cleaned = text.replace(/```json\s*|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
      const summary = String(obj.summary ?? obj.description ?? '').trim();
      const title = String(obj.title ?? obj.name ?? 'Result').trim();
      const western =
        asPerspective(obj.western ?? obj.westernMedicine ?? obj.modern) ??
        undefined;
      const tcm =
        asPerspective(
          obj.tcm ?? obj.chineseMedicine ?? obj.chinese_medical ?? obj.cm
        ) ?? undefined;
      const items = parseItems(
        obj.items ?? obj.ingredients ?? obj.components ?? obj.entries
      );
      let tier = asTier(
        obj.tier ?? obj.level ?? obj.risk ?? western?.tier ?? tcm?.tier
      );
      // Overall tier: at least as cautious as any listed item
      if (items?.length) {
        const worst = items.reduce(
          (acc, it) =>
            tierSeverity(it.tier) < tierSeverity(acc) ? it.tier : acc,
          tier
        );
        tier = worst;
      }
      if (summary || title || western || tcm || items?.length) {
        return {
          tier,
          title: title || 'Result',
          summary:
            summary || western?.summary || tcm?.summary || title || items?.[0]?.name || '',
          caveats: Array.isArray(obj.caveats)
            ? obj.caveats.map(String).slice(0, 4)
            : undefined,
          locale,
          western: western ?? { tier },
          tcm: tcm ?? { tier: 'unknown' },
          items,
        };
      }
    }
  } catch {
    // fall through to heuristics
  }

  // 2) Heuristic free-text extraction
  const lower = text.toLowerCase();
  let tier: SafetyTier = 'unknown';
  if (
    /\b(tier|risk|level)\s*[:：]?\s*(green|safe)/i.test(text) ||
    /風險[：:]\s*綠/.test(text) ||
    /【綠】|🟢/.test(text)
  ) {
    tier = 'green';
  } else if (
    /\b(tier|risk|level)\s*[:：]?\s*(amber|orange|yellow|caution)/i.test(text) ||
    /風險[：:]\s*黃/.test(text) ||
    /【黃】|🟠|🟡/.test(text)
  ) {
    tier = 'amber';
  } else if (
    /\b(tier|risk|level)\s*[:：]?\s*(red|avoid|danger)/i.test(text) ||
    /風險[：:]\s*紅/.test(text) ||
    /【紅】|🔴/.test(text)
  ) {
    tier = 'red';
  } else if (
    /generally (safe|fine|ok)|lower concern|commonly considered safe/i.test(
      lower
    )
  ) {
    tier = 'green';
  } else if (/avoid|not recommended|should not|contraindicated/i.test(lower)) {
    tier = 'red';
  } else if (/caution|limited data|depends|consult/i.test(lower)) {
    tier = 'amber';
  }

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = (lines[0] ?? 'Result').slice(0, 80);
  const summary = lines.slice(0, 4).join(' ').slice(0, 600);

  return {
    tier,
    title,
    summary: summary || title,
    locale,
    western: { tier },
    tcm: { tier: 'unknown' },
  };
}
