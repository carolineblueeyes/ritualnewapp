import React from 'react';
import { Moon } from 'lucide-react';
import { formatSleepDuration, type SleepStripSegment } from './buildStatisticsData';

interface SleepPhaseStripProps {
  totalMinutes: number;
  goalMinutes: number;
  segments: SleepStripSegment[];
  onOpen?: () => void;
}

export default function SleepPhaseStrip({
  totalMinutes,
  goalMinutes,
  segments,
  onOpen,
}: SleepPhaseStripProps) {
  const stripTotal = segments.reduce((sum, s) => sum + s.minutes, 0) || totalMinutes || 1;
  const pct = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;
  const hasSegments = segments.length > 0;

  const Wrapper = onOpen ? 'button' : 'div';
  const wrapperProps = onOpen
    ? { type: 'button' as const, onClick: onOpen, className: 'text-left w-full active:scale-[0.99] transition-transform duration-[160ms]' }
    : { className: 'w-full' };

  return (
    <Wrapper {...wrapperProps}>
      <div className="rounded-[22px] border border-white/[0.08] bg-[#0B0C0E] p-4 flex flex-col gap-3 h-full min-h-[168px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#8D4FFF]/15 border border-[#8D4FFF]/25 flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 text-[#8D4FFF]" />
            </div>
            <div>
              <span className="text-[13px] text-[#F2EFE8]/50 block">Сон</span>
              <span className="font-display text-[22px] font-light tabular-nums text-[#F2EFE8]/92 leading-none">
                {totalMinutes > 0 ? formatSleepDuration(totalMinutes) : '—'}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#F2EFE8]/35 tabular-nums pt-1">{pct}% цели</span>
        </div>

        {hasSegments ? (
          <>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-white/[0.04]">
              {segments.map(seg => (
                <div
                  key={seg.stage}
                  style={{
                    width: `${(seg.minutes / stripTotal) * 100}%`,
                    backgroundColor: seg.color,
                    opacity: seg.stage === 'awake' ? 0.55 : 0.9,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {segments.filter(s => s.stage !== 'awake').map(seg => (
                <span key={seg.stage} className="text-[10px] tabular-nums" style={{ color: seg.color }}>
                  {seg.label} {Math.floor(seg.minutes / 60)}ч {seg.minutes % 60}м
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8D4FFF]/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#F2EFE8]/35">
              {totalMinutes > 0
                ? `${formatSleepDuration(totalMinutes)} из ${formatSleepDuration(goalMinutes)}`
                : 'Нет данных о сне за сегодня'}
            </p>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
