import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import type { SafetyTier } from '../core/types';
import type { TFunction } from '../core/i18n';

const config: Record<
  SafetyTier,
  { className: string; Icon: typeof CheckCircle2; labelKey: string }
> = {
  green: {
    className: 'badge badge-green',
    Icon: CheckCircle2,
    labelKey: 'ask.tiers.green',
  },
  amber: {
    className: 'badge badge-amber',
    Icon: AlertTriangle,
    labelKey: 'ask.tiers.amber',
  },
  red: {
    className: 'badge badge-red',
    Icon: XCircle,
    labelKey: 'ask.tiers.red',
  },
  unknown: {
    className: 'badge badge-unknown',
    Icon: CircleHelp,
    labelKey: 'ask.tiers.unknown',
  },
};

export function SafetyBadge({
  tier,
  t,
  /** Optional prefix, e.g. "Western" / "中醫" */
  label,
}: {
  tier: SafetyTier;
  t: TFunction;
  label?: string;
}) {
  const c = config[tier] ?? config.unknown;
  const Icon = c.Icon;
  const tierLabel = t(c.labelKey);
  return (
    <span className={c.className}>
      <Icon size={14} strokeWidth={2.5} />
      {label ? (
        <>
          <span className="badge-scope">{label}</span>
          <span className="badge-sep" aria-hidden>
            ·
          </span>
          <span>{tierLabel}</span>
        </>
      ) : (
        tierLabel
      )}
    </span>
  );
}
