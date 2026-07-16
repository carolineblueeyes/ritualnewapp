import React, { useMemo } from 'react';
import type { UserStats } from '../types';

interface Props {
  stats: UserStats;
  onClick?: () => void;
}

const LEVEL_COLORS = [
  'rgba(255,255,255,0.04)',
  'rgba(201,169,110,0.18)',
  'rgba(201,169,110,0.35)',
  'rgba(201,169,110,0.55)',
  'rgba(201,169,110,0.80)',
];

function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function normalizeDate(dateStr: string): string {
  const now = new Date();
  if (dateStr.startsWith('Сегодня')) {
    return getDateKey(now);
  }
  if (dateStr.startsWith('Вчера')) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return getDateKey(yesterday);
  }
  const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return dateStr.slice(0, 10);
}

export default function PracticeHeatmap({ stats, onClick }: Props) {
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayCountByDate = new Map<string, number>();

    for (const entry of stats.history) {
      const key = normalizeDate(entry.date);
      dayCountByDate.set(key, (dayCountByDate.get(key) || 0) + 1);
    }

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const days: { key: string; count: number; level: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = getDateKey(d);
      const count = dayCountByDate.get(key) || 0;
      days.push({ key, count, level: getLevel(count) });
    }
    return days;
  }, [stats.history]);

  const todayKey = getDateKey(new Date());
  const totalPractices = stats.history.length;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
    >
      <div className="flex items-center gap-1">
        {weekDays.map((d) => {
          const isToday = d.key === todayKey;
          return (
            <div
              key={d.key}
              className="rounded-[3px] transition-all"
              style={{
                width: 14,
                height: 14,
                backgroundColor: LEVEL_COLORS[d.level],
                border: isToday ? '1.5px solid rgba(201,169,110,0.6)' : '1px solid rgba(255,255,255,0.06)',
              }}
              title={`${d.key}: ${d.count}`}
            />
          );
        })}
      </div>
      <span className="text-[10px] font-mono text-white/20 ml-1">Эта неделя</span>
      {totalPractices > 0 && (
        <span className="text-[10px] font-mono text-white/15 ml-auto">{totalPractices} всего</span>
      )}
    </div>
  );
}
