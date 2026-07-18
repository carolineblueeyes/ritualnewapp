import { UserStats } from '../types';

export const EMPTY_USER_STATS: UserStats = {
  shineScore: 0,
  completedCount: 0,
  streakDays: 0,
  totalMinutes: 0,
  history: [],
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeHistoryDate(dateStr: string): string {
  const now = new Date();
  if (dateStr.startsWith('Сегодня') || dateStr.startsWith('РЎРµРіРѕРґРЅСЏ')) return toDateKey(now);
  if (dateStr.startsWith('Вчера') || dateStr.startsWith('Р’С‡РµСЂР°')) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return toDateKey(yesterday);
  }

  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return dateStr.slice(0, 10);
}

function calculateStreakDays(history: UserStats['history']): number {
  const days = Array.from(new Set(history.map(item => normalizeHistoryDate(item.date)).filter(Boolean))).sort();
  if (days.length === 0) return 0;

  let cursor = new Date(days[days.length - 1]);
  let streak = 0;
  const daySet = new Set(days);

  while (daySet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function isDemoStats(stats: UserStats): boolean {
  return stats.completedCount === 2
    && stats.streakDays === 4
    && stats.totalMinutes === 13
    && stats.history.length === 2
    && stats.history.some(item => item.practiceId === 'end-day')
    && stats.history.some(item => item.practiceId === 'pause');
}

export function deriveRealStats(stats: UserStats): UserStats {
  if (isDemoStats(stats)) return { ...EMPTY_USER_STATS };

  const history = Array.isArray(stats.history) ? stats.history : [];
  const totalMinutes = history.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);

  return {
    ...stats,
    shineScore: Number(stats.shineScore) || 0,
    history,
    completedCount: history.length,
    totalMinutes,
    streakDays: calculateStreakDays(history),
  };
}

export function parseStoredStats(value: string | null): UserStats {
  if (!value) return { ...EMPTY_USER_STATS };

  try {
    return deriveRealStats(JSON.parse(value));
  } catch {
    return { ...EMPTY_USER_STATS };
  }
}
