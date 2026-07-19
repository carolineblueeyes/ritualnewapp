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

function normalizeMinutes(minutes: unknown): number {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1440, Math.round(value * 10) / 10);
}

function sanitizeHistory(history: UserStats['history']): UserStats['history'] {
  if (!Array.isArray(history)) return [];

  const seen = new Set<string>();

  return history
    .map(item => {
      const date = typeof item?.date === 'string' ? item.date.trim() : '';
      const practiceId = typeof item?.practiceId === 'string' ? item.practiceId.trim() : '';
      const practiceTitle = typeof item?.practiceTitle === 'string' ? item.practiceTitle.trim() : '';
      const minutes = normalizeMinutes(item?.minutes);

      if (!date || !practiceId || minutes <= 0) return null;

      const duplicateKey = `${date}|${practiceId}`;
      if (seen.has(duplicateKey)) return null;
      seen.add(duplicateKey);

      return {
        date,
        practiceId,
        practiceTitle,
        minutes,
      };
    })
    .filter((item): item is UserStats['history'][number] => item !== null);
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

  const history = sanitizeHistory(stats.history);
  const totalMinutes = normalizeMinutes(history.reduce((sum, item) => sum + item.minutes, 0));

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
