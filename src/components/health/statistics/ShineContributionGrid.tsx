import React from 'react';
import { shineCellColor, type ShineDayCell } from './buildStatisticsData';

interface ShineContributionGridProps {
  days: ShineDayCell[];
  periodLabel: string;
  selectedIndex: number | null;
  onSelectDay?: (index: number) => void;
  accentColor: string;
}

export default function ShineContributionGrid({
  days,
  periodLabel,
  selectedIndex,
  onSelectDay,
  accentColor,
}: ShineContributionGridProps) {
  const withScore = days.filter(d => d.shineScore !== null).length;
  const avg = days.length
    ? Math.round(
        days.reduce((sum, d) => sum + (d.shineScore ?? 0), 0) / Math.max(1, withScore),
      )
    : null;

  const cols = days.length <= 7 ? days.length : days.length <= 30 ? 6 : 10;

  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0B0C0E] p-4 flex flex-col gap-3 h-full min-h-[168px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[13px] text-[#F2EFE8]/50 block">Сияние · {periodLabel}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-[28px] font-light tabular-nums text-[#F2EFE8]/92 leading-none">
              {avg ?? '—'}
            </span>
            {withScore > 0 && (
              <span className="text-[11px] text-[#F2EFE8]/35">{withScore} дн. с данными</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {[80, 60].map(threshold => (
            <span key={threshold} className="flex items-center gap-1 text-[9px] text-[#F2EFE8]/30">
              <span
                className="w-2 h-2 rounded-[3px]"
                style={{ backgroundColor: shineCellColor(threshold) }}
              />
            </span>
          ))}
        </div>
      </div>

      <div
        className="grid gap-[5px] flex-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {days.map((day, index) => {
          const selected = selectedIndex === index;
          return (
            <button
              key={day.dateStr}
              type="button"
              title={day.label}
              onClick={() => onSelectDay?.(index)}
              className={`aspect-square rounded-[5px] transition-transform duration-[120ms] active:scale-90 ${
                selected ? 'ring-1 ring-offset-1 ring-offset-[#0B0C0E]' : ''
              } ${day.isToday ? 'ring-1 ring-white/20' : ''}`}
              style={{
                backgroundColor: shineCellColor(day.shineScore),
                ...(selected ? { ringColor: accentColor } : {}),
              }}
              aria-label={`${day.label}${day.shineScore !== null ? `, Сияние ${day.shineScore}` : ', нет данных'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
