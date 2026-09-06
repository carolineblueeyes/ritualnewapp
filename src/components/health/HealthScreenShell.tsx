import React from 'react';
import type { HealthPeriod } from './types';
import { alignDateToPeriod } from './format';
import PeriodRing from './PeriodRing';

interface HealthScreenShellProps {
  period: HealthPeriod;
  onPeriodChange: (period: HealthPeriod) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  children: React.ReactNode;
  /** Протокол 02.09: неделя/месяц — через разбор Rail (подписка). */
  periodsLocked?: boolean;
  onLockedPeriodClick?: () => void;
}

const PERIODS: Array<{ id: HealthPeriod; label: string }> = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];

export default function HealthScreenShell({
  period,
  onPeriodChange,
  selectedDate,
  onSelectedDateChange,
  children,
  periodsLocked,
  onLockedPeriodClick,
}: HealthScreenShellProps) {
  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
        {PERIODS.map(item => {
          const locked = periodsLocked && item.id !== 'day';
          const active = period === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (locked) {
                  onLockedPeriodClick?.();
                  return;
                }
                onPeriodChange(item.id);
                onSelectedDateChange(alignDateToPeriod(selectedDate, item.id));
              }}
              className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-all duration-[160ms] ease-out active:scale-[0.97] ${
                active
                  ? 'bg-[#F2EFE8] text-[#08090A] shadow-[0_0_20px_rgba(242,239,232,0.25)]'
                  : 'text-[#F2EFE8]/42'
              }`}
            >
              {item.label}{locked ? ' · Rail' : ''}
            </button>
          );
        })}
      </div>

      <PeriodRing
        period={period}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
      />

      {children}
    </div>
  );
}
