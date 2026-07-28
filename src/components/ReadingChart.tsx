import type { IndicatorKind, Locale } from '../core/types';
import { indicatorLabel } from '../core/indicators/catalog';
import type { SeriesPoint } from '../core/indicators/series';

type Props = {
  kind: IndicatorKind;
  points: SeriesPoint[];
  locale: Locale;
  unitHint?: string;
};

/**
 * Lightweight SVG line chart (no chart library).
 * For BP, plots systolic as primary series.
 */
export function ReadingChart({ kind, points, locale, unitHint }: Props) {
  const w = 320;
  const h = 140;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min || 1;

  const xs = points.map((_, i) =>
    points.length === 1
      ? padL + innerW / 2
      : padL + (i / (points.length - 1)) * innerW
  );
  const ys = points.map(
    (p) => padT + innerH - ((p.value - min) / range) * innerH
  );

  const line = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ');

  const area =
    line +
    ` L ${xs[xs.length - 1].toFixed(1)} ${(padT + innerH).toFixed(1)}` +
    ` L ${xs[0].toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.value - first.value;
  const deltaLabel =
    delta === 0 ? '±0' : delta > 0 ? `+${formatNum(delta)}` : formatNum(delta);

  return (
    <div className="reading-chart">
      <div className="reading-chart-head">
        <strong>{indicatorLabel(kind, locale)}</strong>
        <span className="muted">
          {formatNum(last.value)}
          {unitHint ? ` ${unitHint}` : ''}
          <span className={delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : ''}>
            {' '}
            ({deltaLabel})
          </span>
        </span>
      </div>
      <svg
        className="reading-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={indicatorLabel(kind, locale)}
      >
        <defs>
          <linearGradient id={`fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}
        <path d={area} fill={`url(#fill-${kind})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--primary-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {xs.map((x, i) => (
          <circle
            key={points[i].eventId}
            cx={x}
            cy={ys[i]}
            r="4"
            fill="var(--bg-card)"
            stroke="var(--primary-deep)"
            strokeWidth="2"
          />
        ))}
        <text
          x={padL}
          y={padT + 4}
          className="chart-axis"
          fontSize="10"
          fill="var(--text-muted)"
        >
          {formatNum(max)}
        </text>
        <text
          x={padL}
          y={padT + innerH}
          className="chart-axis"
          fontSize="10"
          fill="var(--text-muted)"
        >
          {formatNum(min)}
        </text>
        <text
          x={padL}
          y={h - 6}
          fontSize="10"
          fill="var(--text-muted)"
        >
          {shortDate(first.date)}
        </text>
        <text
          x={w - padR}
          y={h - 6}
          textAnchor="end"
          fontSize="10"
          fill="var(--text-muted)"
        >
          {shortDate(last.date)}
        </text>
      </svg>
      <p className="muted" style={{ fontSize: '0.78rem' }}>
        {points.length} logs · {shortDate(first.date)} → {shortDate(last.date)}
      </p>
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
}
