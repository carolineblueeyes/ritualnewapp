import React, { useId } from 'react';
import QualityBadge from './QualityBadge';
import MetricGaugeBar from './MetricGaugeBar';
import { finiteOrNull } from './format';
import type { QualityTier } from './healthQuality';
import { HEALTH_GROUP_SURFACE } from './HealthGroup';

interface ChartPoint {
  label: string;
  value: number | null;
}

interface HealthPeriodChartProps {
  points: ChartPoint[];
  color: string;
  unit?: string;
  formatValue?: (value: number) => string;
  baseline?: number;
  areaFill?: boolean;
  bare?: boolean;
}

function formatPoint(value: number, formatValue?: (value: number) => string, unit = '') {
  try {
    return formatValue ? formatValue(value) : `${Math.round(value * 10) / 10}${unit}`;
  } catch {
    return `${Math.round(value * 10) / 10}${unit}`;
  }
}

export default function HealthPeriodChart({
  points,
  color,
  unit = '',
  formatValue,
  baseline,
  areaFill = true,
  bare = false,
}: HealthPeriodChartProps) {
  const reactId = useId().replace(/:/g, '');
  const gradientId = `period-area-${reactId}`;
  const values = points.map(point => finiteOrNull(point.value)).filter((value): value is number => value !== null);
  if (values.length < 1) {
    const empty = (
      <p className="text-[13px] text-[#F2EFE8]/42 py-2">Недостаточно точек для графика за выбранный период.</p>
    );
    if (bare) return empty;
    return <div className={`${HEALTH_GROUP_SURFACE} p-5`}>{empty}</div>;
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = (maxVal - minVal) || 1;
  const paddedMin = minVal - range * 0.15;
  const paddedMax = maxVal + range * 0.15;
  const paddedRange = (paddedMax - paddedMin) || 1;
  const width = 320;
  const height = 140;
  const paddingX = 20;
  const padTop = 12;
  const padBottom = 28;
  const chartH = height - padTop - padBottom;
  const gapX = (width - paddingX * 2) / Math.max(1, points.length - 1);
  const showValueLabels = points.length <= 8;
  const labelStride = Math.max(1, Math.ceil(points.length / 7));
  const dotRadius = points.length > 14 ? 2 : 3.5;

  const coords = points.map((point, index) => {
    const value = finiteOrNull(point.value) ?? paddedMin;
    const x = paddingX + index * gapX;
    const yRaw = padTop + chartH - ((value - paddedMin) / paddedRange) * chartH;
    return {
      x,
      y: Number.isFinite(yRaw) ? yRaw : padTop + chartH,
      point,
      value: finiteOrNull(point.value),
    };
  }).filter(coord => Number.isFinite(coord.x) && Number.isFinite(coord.y));

  const lineCoords = coords.filter(coord => coord.value !== null);
  const linePath = lineCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const baseY = padTop + chartH;
  const areaPath = lineCoords.length > 1
    ? `${linePath} L ${lineCoords[lineCoords.length - 1].x} ${baseY} L ${lineCoords[0].x} ${baseY} Z`
    : '';

  const chart = (
      <svg className="w-full h-36 overflow-hidden pointer-events-none" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((p, idx) => (
          <line
            key={idx}
            x1={paddingX - 8}
            y1={padTop + chartH * (1 - p)}
            x2={width - paddingX + 8}
            y2={padTop + chartH * (1 - p)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}

        {baseline !== undefined && Number.isFinite(baseline) && (() => {
          const y = padTop + chartH - ((baseline - paddedMin) / paddedRange) * chartH;
          if (!Number.isFinite(y) || y < padTop || y > baseY) return null;
          return (
            <g>
              <line
                x1={paddingX - 8}
                y1={y}
                x2={width - paddingX + 8}
                y2={y}
                stroke="rgba(255,255,255,0.16)"
                strokeDasharray="3,3"
                strokeWidth="0.75"
              />
              <text x={width - paddingX + 6} y={y + 3} className="text-[8px] fill-white/30">база</text>
            </g>
          );
        })()}

        {areaFill && areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {lineCoords.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((c, i) => {
          const showDate = i === 0 || i === coords.length - 1 || i % labelStride === 0;
          return (
            <g key={i}>
              {c.value !== null && (
                <circle cx={c.x} cy={c.y} r={dotRadius} fill="#08090A" stroke={color} strokeWidth="2" />
              )}
              {showValueLabels && c.value !== null && (
                <text x={c.x} y={c.y - 8} textAnchor="middle" className="text-[9px] fill-white/75">
                  {formatPoint(c.value, formatValue, unit)}
                </text>
              )}
              {showDate && (
                <text x={c.x} y={height - 6} textAnchor="middle" className="text-[9px] fill-white/30">
                  {c.point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
  );

  if (bare) return chart;
  return <div className={`${HEALTH_GROUP_SURFACE} p-4 overflow-hidden`}>{chart}</div>;
}

interface StageBarProps {
  label: string;
  minutes: number;
  total: number;
  color: string;
  tier?: QualityTier | null;
}

export function StageProgressBar({ label, minutes, total, color, tier }: StageBarProps) {
  const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center gap-2">
        <span className="text-[13px] text-[#F2EFE8]/50">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#F2EFE8]/80 tabular-nums">
            {Math.floor(minutes / 60)}ч {minutes % 60}м · {pct}%
          </span>
          {tier != null && <QualityBadge tier={tier} />}
        </div>
      </div>
      <MetricGaugeBar value={minutes} max={total} color={color} />
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  hint?: string;
  tier?: QualityTier | null;
}

export function StatRow({ label, value, hint, tier }: StatRowProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[rgba(242,239,232,0.08)] last:border-0 gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-[#F2EFE8]/42">{label}</span>
        {hint && <span className="text-[11px] text-[#F2EFE8]/30">{hint}</span>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[15px] text-[#F2EFE8]/88 tabular-nums">{value}</span>
        {tier != null && <QualityBadge tier={tier} />}
      </div>
    </div>
  );
}
