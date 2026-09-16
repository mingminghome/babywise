import { useState } from 'react';
import type { IndicatorKind, Locale } from '../core/types';
import { indicatorLabel } from '../core/indicators/catalog';
import {
  movingAverage,
  seriesMean,
  type SeriesPoint,
} from '../core/indicators/series';
import type { TFunction } from '../core/i18n';

type Props = {
  kind: IndicatorKind;
  points: SeriesPoint[];
  locale: Locale;
  unitHint?: string;
  t?: TFunction;
};

/**
 * Generates a smooth Catmull-Rom cubic bezier curve through data points.
 */
function generateSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Premium SVG trend chart with clean numerical scales, interactive inspection,
 * smooth cubic bezier curves, and clear axis alignments.
 */
export function ReadingChart({ kind, points, locale, unitHint, t }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const w = 340;
  const h = 156;
  const padL = 46;
  const padR = 14;
  const padT = 20;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const values = points.map((p) => p.value);
  const mean = seriesMean(points);
  const ma = points.length >= 3 ? movingAverage(points, 3) : null;

  let rawMin = Math.min(...values);
  let rawMax = Math.max(...values);
  if (mean != null) {
    rawMin = Math.min(rawMin, mean);
    rawMax = Math.max(rawMax, mean);
  }
  if (rawMin === rawMax) {
    rawMin -= 1;
    rawMax += 1;
  }

  // Add 6% headroom and footroom so points don't clip against borders
  const span = rawMax - rawMin || 1;
  const min = Number((rawMin - span * 0.06).toFixed(1));
  const max = Number((rawMax + span * 0.06).toFixed(1));
  const mid = Number(((min + max) / 2).toFixed(1));
  const range = max - min || 1;

  const yAt = (v: number) => padT + innerH - ((v - min) / range) * innerH;

  const xs = points.map((_, i) =>
    points.length === 1
      ? padL + innerW / 2
      : padL + (i / (points.length - 1)) * innerW
  );
  const ys = points.map((p) => yAt(p.value));
  const pts = points.map((_, i) => ({ x: xs[i], y: ys[i] }));

  const meanY = mean != null ? yAt(mean) : null;
  const line = generateSmoothPath(pts);

  const area =
    line +
    ` L ${xs[xs.length - 1].toFixed(1)} ${(padT + innerH).toFixed(1)}` +
    ` L ${xs[0].toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const maPts = ma ? ma.map((m, i) => ({ x: xs[i], y: yAt(m) })) : null;
  const maLine = maPts ? generateSmoothPath(maPts) : null;

  const selectedIdx =
    activeIdx != null && activeIdx >= 0 && activeIdx < points.length
      ? activeIdx
      : points.length - 1;
  const activePoint = points[selectedIdx];
  const activeX = xs[selectedIdx];
  const activeY = ys[selectedIdx];

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.value - first.value;
  const deltaLabel =
    delta === 0 ? '±0' : delta > 0 ? `+${formatNum(delta)}` : formatNum(delta);

  const deltaClass =
    delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-flat';

  const gridSteps = [
    { frac: 1, val: max, y: padT },
    { frac: 0.5, val: mid, y: padT + innerH * 0.5 },
    { frac: 0, val: min, y: padT + innerH },
  ];

  return (
    <div className="reading-chart">
      {/* Chart Header with Crisp Numerics */}
      <div className="reading-chart-head">
        <div className="reading-chart-meta">
          <strong className="reading-chart-title">
            {indicatorLabel(kind, locale)}
          </strong>
          <span className="reading-count-pill">
            {points.length} {t ? t('home.chartLogsShort') || 'records' : 'records'}
          </span>
        </div>

        <div className="reading-chart-stat">
          <span className="reading-stat-val">
            {formatNum(activePoint.value)}
          </span>
          {unitHint && <span className="reading-stat-unit">{unitHint}</span>}
          <span className={`reading-delta-pill ${deltaClass}`}>
            {selectedIdx === points.length - 1 ? deltaLabel : shortDate(activePoint.date, locale)}
          </span>
        </div>
      </div>

      {/* Main SVG Area */}
      <svg
        className="reading-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={indicatorLabel(kind, locale)}
        onPointerLeave={() => setActiveIdx(null)}
      >
        <defs>
          <linearGradient id={`fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
            <stop offset="85%" stopColor="var(--primary)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid & Clean Numerical Left Y-Axis */}
        {gridSteps.map(({ frac, val, y }) => (
          <g key={frac} className="chart-grid-row">
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={frac === 0.5 ? '4 3' : undefined}
              opacity={frac === 0.5 ? 0.45 : 0.75}
            />
            <text
              x={padL - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="9.5"
              fontWeight="600"
              fill="var(--text-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatNum(val)}
            </text>
          </g>
        ))}

        {/* Baseline Axis */}
        <line
          x1={padL}
          x2={w - padR}
          y1={padT + innerH}
          y2={padT + innerH}
          stroke="var(--border)"
          strokeWidth="1.2"
        />

        {/* Shaded Area */}
        <path d={area} fill={`url(#fill-${kind})`} />

        {/* Moving Average Line (if 3+ readings) */}
        {maLine && (
          <path
            d={maLine}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="3 3"
            opacity="0.6"
          />
        )}

        {/* Mean / Average Reference Line */}
        {mean != null && meanY != null && (
          <g className="chart-mean-group">
            <line
              x1={padL}
              x2={w - padR}
              y1={meanY}
              y2={meanY}
              stroke="var(--amber)"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <text
              x={w - padR}
              y={meanY - 5}
              textAnchor="end"
              fontSize="8"
              fontWeight="700"
              fill="var(--amber)"
              letterSpacing="0.04em"
            >
              AVG {formatNum(mean)}
            </text>
          </g>
        )}

        {/* Primary Trend Curve */}
        <path
          d={line}
          fill="none"
          stroke="var(--primary-deep)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Inspection Crosshair */}
        <line
          x1={activeX}
          x2={activeX}
          y1={padT}
          y2={padT + innerH}
          stroke="var(--primary)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.45"
        />

        {/* Data Points */}
        {xs.map((x, i) => {
          const isSelected = i === selectedIdx;
          return (
            <g key={points[i].eventId ?? `pt-${i}`} className="chart-point-group">
              {/* Generous touch/hover hit zone */}
              <circle
                cx={x}
                cy={ys[i]}
                r="16"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setActiveIdx(i)}
                onPointerDown={() => setActiveIdx(i)}
              />

              {/* Halo on selected point */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={ys[i]}
                  r="7.5"
                  fill="var(--primary)"
                  opacity="0.25"
                />
              )}

              {/* Point Dot */}
              <circle
                cx={x}
                cy={ys[i]}
                r={isSelected ? 4.5 : 3.2}
                fill="var(--bg-card)"
                stroke="var(--primary-deep)"
                strokeWidth={isSelected ? 2.5 : 1.8}
              />
            </g>
          );
        })}

        {/* Floating Tooltip Callout */}
        {(() => {
          const ttW = 78;
          const ttH = 26;
          const ttX = Math.min(Math.max(activeX - ttW / 2, padL), w - padR - ttW);
          const ttY = activeY - 32 >= padT ? activeY - 32 : activeY + 12;
          return (
            <g className="chart-tooltip-group" transform={`translate(${ttX}, ${ttY})`}>
              <rect
                width={ttW}
                height={ttH}
                rx="6"
                fill="var(--bg-card)"
                stroke="var(--border)"
                strokeWidth="1"
                filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"
              />
              <text
                x={ttW / 2}
                y={ttH / 2 - 4}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9.5"
                fontWeight="700"
                fill="var(--text-main)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatNum(activePoint.value)}
                {unitHint ? ` ${unitHint}` : ''}
              </text>
              <text
                x={ttW / 2}
                y={ttH / 2 + 6}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fontWeight="500"
                fill="var(--text-muted)"
              >
                {shortDate(activePoint.date, locale)}
              </text>
            </g>
          );
        })()}

        {/* X-Axis Dates */}
        {points.length === 1 ? (
          <text
            x={padL + innerW / 2}
            y={h - 8}
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="500"
            fill="var(--text-muted)"
          >
            {shortDate(first.date, locale)}
          </text>
        ) : points.length === 2 ? (
          <>
            <text
              x={padL}
              y={h - 8}
              textAnchor="start"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--text-muted)"
            >
              {shortDate(first.date, locale)}
            </text>
            <text
              x={w - padR}
              y={h - 8}
              textAnchor="end"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--text-muted)"
            >
              {shortDate(last.date, locale)}
            </text>
          </>
        ) : (
          <>
            <text
              x={padL}
              y={h - 8}
              textAnchor="start"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--text-muted)"
            >
              {shortDate(first.date, locale)}
            </text>
            <text
              x={padL + innerW * 0.5}
              y={h - 8}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--text-muted)"
            >
              {shortDate(points[Math.floor(points.length / 2)].date, locale)}
            </text>
            <text
              x={w - padR}
              y={h - 8}
              textAnchor="end"
              fontSize="9.5"
              fontWeight="500"
              fill="var(--text-muted)"
            >
              {shortDate(last.date, locale)}
            </text>
          </>
        )}
      </svg>

      {/* Chart Footer: Legend & Context Hint */}
      <div className="reading-chart-footer">
        <div className="reading-chart-legend">
          <span className="legend-item">
            <span className="legend-dot is-trend" />
            <span>Trend</span>
          </span>
          {mean != null && (
            <span className="legend-item">
              <span className="legend-dot is-avg" />
              <span>Avg: {formatNum(mean)}{unitHint ? ` ${unitHint}` : ''}</span>
            </span>
          )}
        </div>
        <div className="reading-chart-hint">
          {t ? t('home.chartDayAvg') : 'Each point is that day’s average'}
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function shortDate(iso: string, locale?: Locale): string {
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (locale === 'zh-Hant') {
    return `${m}月${d}日`;
  }

  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${MONTHS[m - 1] || m} ${d}`;
}
