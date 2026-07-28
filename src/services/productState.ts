import type { UserStats } from '../types';
import { ensureAnonymousSession, hasSupabaseConfig, supabase } from './supabase/client';

export interface RitualGoal {
  id: string;
  title: string;
  targetCount: number;
  period: 'week' | 'month';
  createdAt: string;
  archived?: boolean;
}

export interface RitualNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

const GOALS_KEY = 'ritual_goals_v1';
const NOTES_KEY = 'ritual_notes_v1';
const INSIGHT_READS_KEY = 'ritual_insight_reads_v1';

function readArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveArray<T>(key: string, values: T[]): void {
  localStorage.setItem(key, JSON.stringify(values));
}

export function getGoals(): RitualGoal[] {
  return readArray<RitualGoal>(GOALS_KEY).filter(goal => !goal.archived);
}

function getAllGoals(): RitualGoal[] {
  return readArray<RitualGoal>(GOALS_KEY);
}

export function addGoal(title: string, targetCount: number, period: RitualGoal['period'] = 'week'): RitualGoal {
  const goal: RitualGoal = {
    id: `goal_${Date.now().toString(36)}`,
    title: title.trim().slice(0, 120),
    targetCount: Math.max(1, Math.min(period === 'week' ? 21 : 90, Math.round(targetCount))),
    period,
    createdAt: new Date().toISOString(),
  };
  saveArray(GOALS_KEY, [goal, ...getAllGoals()]);
  void syncProductState();
  return goal;
}

export function archiveGoal(id: string): void {
  saveArray(GOALS_KEY, getAllGoals().map(goal => goal.id === id ? { ...goal, archived: true } : goal));
  void syncProductState();
}

export function getNotes(): RitualNote[] {
  return readArray<RitualNote>(NOTES_KEY).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addNote(body: string): RitualNote {
  const note: RitualNote = { id: `note_${Date.now().toString(36)}`, body: body.trim().slice(0, 2000), createdAt: new Date().toISOString() };
  saveArray(NOTES_KEY, [note, ...getNotes()].slice(0, 100));
  void syncProductState();
  return note;
}

export function deleteNote(id: string): void {
  saveArray(NOTES_KEY, getNotes().filter(note => note.id !== id));
  void syncProductState();
}

export function getAchievementDefinitions(stats: UserStats): AchievementDefinition[] {
  const uniqueDays = new Set(stats.history.map(item => item.date.slice(0, 10))).size;
  return [
    { id: 'first_ritual', title: 'Первый шаг', description: 'Завершить первый ритуал', icon: '✦', unlocked: stats.completedCount >= 1 },
    { id: 'seven_rituals', title: 'Ритм', description: 'Завершить 7 ритуалов', icon: '◌', unlocked: stats.completedCount >= 7 },
    { id: 'seven_days', title: 'Неделя внимания', description: 'Практиковать 7 разных дней', icon: '◇', unlocked: uniqueDays >= 7 },
    { id: 'streak_7', title: 'Поток', description: 'Серия из 7 дней', icon: '≈', unlocked: stats.streakDays >= 7 },
    { id: 'sixty_minutes', title: 'Час для себя', description: 'Накопить 60 минут практики', icon: '◉', unlocked: stats.totalMinutes >= 60 },
  ];
}

export async function syncAchievements(stats: UserStats): Promise<boolean> {
  if (!hasSupabaseConfig() || !supabase) return false;
  const session = await ensureAnonymousSession();
  const userId = session?.user.id;
  if (!userId) return false;
  const unlocked = getAchievementDefinitions(stats).filter(item => item.unlocked);
  if (!unlocked.length) return true;
  const rows = unlocked.map(item => ({
    user_id: userId,
    achievement_id: item.id,
    unlocked_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('user_achievements').upsert(rows, { onConflict: 'user_id,achievement_id' });
  return !error;
}

export function goalProgress(goal: RitualGoal, stats: UserStats, now = new Date()): number {
  const days = goal.period === 'week' ? 7 : 30;
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days + 1);
  const thresholdKey = threshold.toISOString().slice(0, 10);
  return stats.history.filter(item => item.date.slice(0, 10) >= thresholdKey).length;
}

export function markInsightRead(id: string): void {
  const ids = new Set(readArray<string>(INSIGHT_READS_KEY));
  ids.add(id);
  saveArray(INSIGHT_READS_KEY, [...ids]);
  void syncProductState();
}

export function getReadInsightIds(): string[] {
  return readArray<string>(INSIGHT_READS_KEY);
}

export async function syncProductState(): Promise<boolean> {
  if (!hasSupabaseConfig() || !supabase) return false;
  const session = await ensureAnonymousSession();
  const userId = session?.user.id;
  if (!userId) return false;
  const now = new Date().toISOString();
  const goals = getAllGoals().map(goal => ({ user_id: userId, id: goal.id, title: goal.title, target_count: goal.targetCount, period: goal.period, archived: Boolean(goal.archived), created_at: goal.createdAt, updated_at: now }));
  const notes = getNotes().map(note => ({ user_id: userId, id: note.id, body: note.body, created_at: note.createdAt, updated_at: now }));
  const reads = getReadInsightIds().map(insightId => ({ user_id: userId, insight_id: insightId, read_at: now }));
  const operations: PromiseLike<unknown>[] = [];
  if (goals.length) operations.push(supabase.from('user_goals').upsert(goals, { onConflict: 'id' }));
  if (notes.length) operations.push(supabase.from('user_notes').upsert(notes, { onConflict: 'id' }));
  if (reads.length) operations.push(supabase.from('insight_reads').upsert(reads, { onConflict: 'user_id,insight_id' }));
  const results = await Promise.allSettled(operations);
  return results.every(result => result.status === 'fulfilled');
}
