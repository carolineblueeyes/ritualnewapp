import React, { useMemo } from 'react';
import type { RingPoint } from '../../services/health/x6RingPlugin';
import type { QualityTier } from './healthQuality';
import QualityBadge from './QualityBadge';
import { HEALTH_GROUP_SURFACE } from './HealthGroup';

interface OvernightAreaChartProps {
  title: string;
  unit: string;
  color: string;
  fillColor?: string;
  points: RingPoint[];
  avg?: number | null;
  min?: number | null;
  max?: number | null;
  tier?: QualityTier | null;
  formatValue?: (value: number) => string;
}

/** JCRing SleepHrView / SleepHrvView style: grid + gradient area + line. */
export default function OvernightAreaChart({
  title,
  unit,
  color,
  fillColor,
  points,
  avg,
  min,
  max,
  tier,
  formatValue,
}: OvernightAreaChartProps) {
  const chart = useMemo(() => {
    const usable = points.filter(p => Number.isFinite(p.value));
    if (usable.length < 2) return null;
    const values = usable.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const paddedMin = minVal - range * 0.12;
    const paddedMax = maxVal + range * 0.12;
    const paddedRange = paddedMax - paddedMin || 1;

    const width = 320;
    const height = 120;
    const padX = 28;
    const padTop = 12;
    const padBottom = 22;
    const chartH = height - padTop - padBottom;
    const gapX = (width - padX * 2) / (usable.length - 1);

    const coords = usable.map((point, index) => {
      const x = padX + index * gapX;
      const yRaw = padTop + chartH - ((point.value - paddedMin) / paddedRange) * chartH;
      return {
        x,
        y: Number.isFinite(yRaw) ? yRaw : padTop + chartH,
        value: point.value,
        time: new Date(point.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const baseY = padTop + chartH;
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`;

    const avgY = avg != null
      ? padTop + chartH - ((avg - paddedMin) / paddedRange) * chartH
      : null;

    return { width, height, padX, padTop, chartH, coords, linePath, areaPath, avgY, paddedMin, paddedMax };
  }, [points, avg]);

  const fmt = formatValue ?? ((v: number) => `${Math.round(v)}${unit}`);
  const gradientId = `area-${title.replace(/\s/g, '-')}`;

  return (
    <div className={`${HEALTH_GROUP_SURFACE} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-[#F2EFE8]/50">{title}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#F2EFE8]/35 tabular-nums">
            {avg != null && <span>ср. {fmt(avg)}</span>}
            {min != null && max != null && <span>{fmt(min)} – {fmt(max)}</span>}
          </div>
        </div>
        {tier != null && <QualityBadge tier={tier} />}
      </div>

      {!chart ? (
        <p className="text-[12px] text-[#F2EFE8]/35 py-8 text-center">Нет данных за эту ночь</p>
      ) : (
        <svg className="w-full h-28 overflow-hidden pointer-events-none" viewBox={`0 0 ${chart.width} ${chart.height}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor ?? color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fillColor ?? color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map(p => (
            <line
              key={p}
              x1={chart.padX - 4}
              y1={chart.padTop + chart.chartH * (1 - p)}
              x2={chart.width - chart.padX + 4}
              y2={chart.padTop + chart.chartH * (1 - p)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          ))}

          {chart.avgY != null && (
            <line
              x1={chart.padX - 4}
              y1={chart.avgY}
              x2={chart.width - chart.padX + 4}
              y2={chart.avgY}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="3,3"
              strokeWidth="0.75"
            />
          )}

          <path d={chart.areaPath} fill={`url(#${gradientId})`} />
          <path d={chart.linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

          {chart.coords.filter((_, i) => i === 0 || i === chart.coords.length - 1 || i % Math.max(1, Math.ceil(chart.coords.length / 5)) === 0).map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="2.75" fill="#08090A" stroke={color} strokeWidth="1.5" />
              <text x={c.x} y={chart.height - 4} textAnchor="middle" className="text-[8px] fill-white/30">
                {c.time}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
