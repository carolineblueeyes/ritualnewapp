import { useMemo } from 'react';
import { Moon } from 'lucide-react';
import GlassSurface from '../ui/GlassSurface';
import type { SleepNight } from '../../services/health/types';
import { averageMidpoint, bedtimeWindow, sleepDebt } from '../../services/health/sleep';

interface SleepDebtCardProps {
  nights: SleepNight[];
  debtHours?: number;
  sleepNeedHours?: number;
}

/** Долг сна + окно отбоя на «Сегодня». Пересчёт окна — раз в неделю по смыслу. */
export default function SleepDebtCard({ nights, debtHours, sleepNeedHours = 7.5 }: SleepDebtCardProps) {
  const debt = debtHours ?? useMemo(() => sleepDebt(nights, sleepNeedHours), [nights, sleepNeedHours]);
  const window = useMemo(
    () => bedtimeWindow(sleepNeedHours, averageMidpoint(nights)),
    [nights, sleepNeedHours],
  );
  const recent = useMemo(() => nights.filter(night => night.sleepHours != null).slice(-7), [nights]);

  if (recent.length < 2 && debt <= 0) return null;

  const debtLabel = debt > 0.5
    ? `Недосып ${debt.toFixed(1)} ч за неделю`
    : debt < -0.5
      ? `Запас ${(Math.abs(debt)).toFixed(1)} ч`
      : 'Сон в норме';
  const barWidth = Math.max(0, Math.min(100, (Math.min(debt, 8) / 8) * 100));

  return (
    <GlassSurface className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] text-[#F2EFE8]/45">
          <Moon className="h-4 w-4 text-violet-200/70" />
          Сон
        </span>
        <span className="text-[13px] text-[#F2EFE8]/70">{debtLabel}</span>
      </div>
      {debt > 0.5 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-violet-300/70" style={{ width: `${barWidth}%` }} />
        </div>
      )}
      {window && (
        <p className="text-[12px] leading-relaxed text-[#F2EFE8]/40">
          Окно отбоя {window.from}–{window.to} · норма {window.needHours} ч
        </p>
      )}
    </GlassSurface>
  );
}
