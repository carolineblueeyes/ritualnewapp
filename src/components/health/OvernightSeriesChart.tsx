import React, { useMemo } from 'react';
import type { RingPoint } from '../../services/health/x6RingPlugin';

interface OvernightSeriesChartProps {
  title: string;
  unit: string;
  color: string;
  points: RingPoint[];
  avg?: number | null;
  min?: number | null;
  max?: number | null;
  formatValue?: (value: number) => string;
}

export default function OvernightSeriesChart({
  title,
  unit,
  color,
  points,
  avg,
  min,
  max,
  formatValue,
}: OvernightSeriesChartProps) {
  const coords = useMemo(() => {
    if (points.length < 2) return [];
    const values = points.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const paddedMin = minVal - range * 0.1;
    const paddedMax = maxVal + range * 0.1;
    const paddedRange = paddedMax - paddedMin || 1;
    const width = 300;
    const paddingX = 16;
    const gapX = (width - paddingX * 2) / (points.length - 1);

    return points.map((point, index) => ({
      x: paddingX + index * gapX,
      y: 90 - ((point.value - paddedMin) / paddedRange) * 60,
      value: point.value,
      time: new Date(point.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [points]);

  const fmt = formatValue ?? ((v: number) => `${Math.round(v)}${unit}`);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] text-[#F2EFE8]/50">{title}</span>
        <div className="flex gap-3 text-[10px] text-[#F2EFE8]/35 tabular-nums">
          {avg != null && <span>ср. {fmt(avg)}</span>}
          {min != null && max != null && <span>{fmt(min)}–{fmt(max)}</span>}
        </div>
      </div>

      {coords.length < 2 ? (
        <p className="text-[12px] text-[#F2EFE8]/35 py-6 text-center">Нет почасовых данных за эту ночь</p>
      ) : (
        <svg className="w-full h-24 overflow-visible" viewBox="0 0 300 100">
          <path
            d={coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {coords.filter((_, i) => i === 0 || i === coords.length - 1 || i % Math.ceil(coords.length / 4) === 0).map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="2.5" fill="#070709" stroke={color} strokeWidth="1.5" />
              <text x={c.x} y={98} textAnchor="middle" className="text-[8px] fill-white/30">{c.time}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
