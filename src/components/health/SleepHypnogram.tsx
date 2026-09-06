import React, { useMemo } from 'react';
import type { RingDailySummary } from '../../services/health/x6RingPlugin';
import { SLEEP_STAGE_META, type SleepStageKey } from './sleepUtils';
import { formatClockTime } from './format';

const STAGE_LEVEL: Record<SleepStageKey, number> = {
  awake: 0,
  light: 1,
  deep: 2,
  rem: 3,
  unknown: 1,
};

interface SleepHypnogramProps {
  summary: RingDailySummary | null;
}

export default function SleepHypnogram({ summary }: SleepHypnogramProps) {
  const segments = useMemo(() => {
    if (!summary?.sleepIntervals?.length) return [];
    const startMs = new Date(summary.sleepStart || summary.sleepIntervals[0].start).getTime();
    const endMs = new Date(summary.sleepEnd || summary.sleepIntervals[summary.sleepIntervals.length - 1].end).getTime();
    const total = Math.max(endMs - startMs, 1);

    return summary.sleepIntervals.map(interval => {
      const from = new Date(interval.start).getTime();
      const to = new Date(interval.end).getTime();
      const left = ((from - startMs) / total) * 100;
      const width = Math.max(((to - from) / total) * 100, 0.4);
      return {
        stage: interval.stage as SleepStageKey,
        left,
        width,
      };
    });
  }, [summary]);

  if (!segments.length) {
    return (
      <p className="text-[13px] text-[#F2EFE8]/42 leading-relaxed py-1">
        Детальные фазы сна появятся после синхронизации Ritual Ring. Health Connect / Apple Health пока дают только суммарную длительность.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="flex justify-between text-[11px] text-[#F2EFE8]/40 tabular-nums">
        <span>{formatClockTime(summary?.sleepStart)}</span>
        <span>{formatClockTime(summary?.sleepEnd)}</span>
      </div>

      <div className="relative h-28 rounded-xl bg-[#0B0C0E] border border-white/[0.04] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1/4 border-b border-white/[0.04]" />
        <div className="absolute inset-x-0 top-1/4 h-1/4 border-b border-white/[0.04]" />
        <div className="absolute inset-x-0 top-2/4 h-1/4 border-b border-white/[0.04]" />
        <div className="absolute left-2 top-2 flex flex-col gap-[18px] text-[9px] text-[#F2EFE8]/28">
          <span>REM</span>
          <span>Глуб.</span>
          <span>Лёгк.</span>
          <span>Бодр.</span>
        </div>

        {segments.map((segment, index) => {
          const level = STAGE_LEVEL[segment.stage] ?? 1;
          const top = `${(3 - level) * 25 + 8}%`;
          const height = '18%';
          const color = SLEEP_STAGE_META[segment.stage]?.color ?? '#6B7280';
          return (
            <div
              key={`${segment.stage}-${index}`}
              className="absolute rounded-sm"
              style={{
                left: `${segment.left}%`,
                width: `${segment.width}%`,
                top,
                height,
                backgroundColor: color,
                opacity: 0.92,
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.keys(SLEEP_STAGE_META) as SleepStageKey[]).filter(key => key !== 'unknown').map(stage => (
          <div key={stage} className="flex items-center gap-1.5 text-[11px] text-[#F2EFE8]/50">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SLEEP_STAGE_META[stage].color }} />
            {SLEEP_STAGE_META[stage].label}
          </div>
        ))}
      </div>
    </div>
  );
}
