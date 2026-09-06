import React, { useMemo } from 'react';
import { buildRadarScores } from './buildStatisticsData';
import type { ShineBreakdown } from '../../../services/health/shine';
import type { HealthSection } from '../types';

interface BalanceRadarChartProps {
  shine?: ShineBreakdown;
  accentColor: string;
  onOpenSection?: (section: HealthSection) => void;
}

export default function BalanceRadarChart({ shine, accentColor, onOpenSection }: BalanceRadarChartProps) {
  const axes = useMemo(() => buildRadarScores(shine), [shine]);
  const hasData = axes.some(a => a.score > 0);

  const chart = useMemo(() => {
    const size = 120;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = 44;
    const levels = [0.25, 0.5, 0.75, 1];
    const count = axes.length;
    const angleStep = (Math.PI * 2) / count;
    const startAngle = -Math.PI / 2;

    const pointAt = (index: number, ratio: number) => {
      const angle = startAngle + index * angleStep;
      return {
        x: cx + Math.cos(angle) * maxR * ratio,
        y: cy + Math.sin(angle) * maxR * ratio,
      };
    };

    const dataPoints = axes.map((axis, i) => pointAt(i, Math.max(0.08, axis.score / 100)));
    const polygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    return { size, cx, cy, maxR, levels, axes, angleStep, startAngle, pointAt, polygon, dataPoints };
  }, [axes]);

  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0B0C0E] p-4 flex flex-col gap-2 h-full min-h-[168px]">
      <span className="text-[13px] text-[#F2EFE8]/50">Баланс Сияния</span>

      {!hasData ? (
        <p className="text-[12px] text-[#F2EFE8]/35 flex-1 flex items-center justify-center text-center px-2">
          Подключите данные здоровья для баланса
        </p>
      ) : (
        <>
          <svg viewBox={`0 0 ${chart.size} ${chart.size}`} className="w-full max-w-[140px] mx-auto h-[120px]">
            <defs>
              <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.12" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={chart.cx} cy={chart.cy} r={chart.maxR + 4} fill="url(#radar-glow)" />

            {chart.levels.map(level => (
              <polygon
                key={level}
                points={chart.axes.map((_, i) => {
                  const p = chart.pointAt(i, level);
                  return `${p.x},${p.y}`;
                }).join(' ')}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.75"
              />
            ))}

            {chart.axes.map((_, i) => {
              const p = chart.pointAt(i, 1);
              return (
                <line
                  key={i}
                  x1={chart.cx}
                  y1={chart.cy}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.75"
                />
              );
            })}

            <polygon
              points={chart.polygon}
              fill={`${accentColor}33`}
              stroke={accentColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {chart.dataPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#08090A" stroke={accentColor} strokeWidth="1.5" />
            ))}
          </svg>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {axes.map(axis => (
              <button
                key={axis.key}
                type="button"
                onClick={() => onOpenSection?.(axis.section)}
                className="flex items-center justify-between text-left active:opacity-70"
              >
                <span className="text-[10px] text-[#F2EFE8]/40">{axis.label}</span>
                <span className="text-[11px] tabular-nums text-[#F2EFE8]/75">{axis.score}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
