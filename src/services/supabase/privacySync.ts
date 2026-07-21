import type { UserStats } from '../../types';
import { normalizeHistoryDate, parseStoredStats } from '../progressStats';
import type { DataSource } from '../health/manager';
import type { ShineBreakdown } from '../health/shine';
import { ensureAnonymousSession, hasSupabaseConfig, supabase } from './client';

export const PRIVACY_SAFE_SYNC_EVENT = 'ritual:privacy-safe-sync-request';
const PRIVACY_CONSENT_VERSION = '2026-07-19';

type ReflectionAnswer = 'yes' | 'partially' | 'no';

interface PrivacySafeSyncInput {
  stats?: UserStats;
  shine?: ShineBreakdown;
  healthSource?: DataSource;
  onboardingCompleted?: boolean;
}

interface SyncResult {
  ok: boolean;
  skipped?: 'not_configured' | 'not_authenticated';
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readStringArray(key: string): string[] {
  const parsed = safeJson<unknown>(localStorage.getItem(key), []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function readStats(fallback?: UserStats): UserStats {
  if (fallback) return fallback;
  return parseStoredStats(localStorage.getItem('ritual_stats'));
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildPracticeEvents(userId: string, stats: UserStats) {
  return stats.history
    .map((item, index) => {
      const eventDate = normalizeHistoryDate(item.date);
      const minutes = Number(item.minutes) || 0;
      if (!eventDate || !item.practiceId || minutes <= 0) return null;

      return {
        user_id: userId,
        client_event_id: `practice_${stableHash(`${item.date}|${item.practiceId}|${minutes}|${index}`)}`,
        practice_id: item.practiceId,
        event_date: eventDate,
        duration_minutes: Math.min(1440, Math.max(1, Math.round(minutes))),
        source: 'app',
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function buildDailyProgress(userId: string, stats: UserStats, shine?: ShineBreakdown) {
  const byDate = new Map<string, { total: number; count: number }>();

  for (const item of stats.history) {
    const date = normalizeHistoryDate(item.date);
    const minutes = Number(item.minutes) || 0;
    if (!date || minutes <= 0) continue;

    const current = byDate.get(date) ?? { total: 0, count: 0 };
    current.total += Math.round(minutes);
    current.count += 1;
    byDate.set(date, current);
  }

  return Array.from(byDate.entries()).map(([date, value]) => ({
    user_id: userId,
    date,
    total_minutes: value.total,
    completed_count: value.count,
    streak_days: stats.streakDays,
    shine_score_derived: date === todayKey() ? (shine?.total ?? stats.shineScore ?? 0) : stats.shineScore ?? 0,
    updated_at: new Date().toISOString(),
  }));
}

function buildReflection(userId: string) {
  const date = localStorage.getItem('ritual_reflection_date') || '';
  const answer = localStorage.getItem('ritual_reflection_answer') as ReflectionAnswer | null;
  const reaction = localStorage.getItem('ritual_reflection_reaction') || null;
  if (!date || !answer || !['yes', 'partially', 'no'].includes(answer)) return null;

  return {
    user_id: userId,
    date,
    answer,
    reaction,
    updated_at: new Date().toISOString(),
  };
}

function buildIntention(userId: string) {
  const date = localStorage.getItem('ritual_day_focus_date') || '';
  const presetId = localStorage.getItem('ritual_day_focus_preset_id') || '';
  if (!date || !presetId) return null;

  return {
    user_id: userId,
    date,
    preset_intention_id: presetId,
    updated_at: new Date().toISOString(),
  };
}

function buildPreferences(userId: string, onboardingCompleted?: boolean) {
  return {
    user_id: userId,
    favorite_practice_ids: readStringArray('ritual_favorite_practices_list'),
    favorite_atmosphere_ids: readStringArray('ritual_atmosphere_favorites'),
    notification_settings: {
      enabled: localStorage.getItem('ritual_notifications_enabled') !== 'false',
      reminderTime: localStorage.getItem('ritual_reminder_time') || '21:00',
    },
    onboarding_completed: onboardingCompleted ?? localStorage.getItem('ritual_onboarding_completed') === 'true',
    privacy_consent_version: PRIVACY_CONSENT_VERSION,
    display_name: localStorage.getItem('ritual_user_name') || null,
    gender: localStorage.getItem('ritual_user_gender') || 'unspecified',
    is_subscribed: localStorage.getItem('ritual_is_subscribed') === 'true',
    updated_at: new Date().toISOString(),
  };
}

function buildHealthDerived(userId: string, shine?: ShineBreakdown, healthSource?: DataSource) {
  if (!shine) return null;

  return {
    user_id: userId,
    date: todayKey(),
    score: Math.max(0, Math.min(100, Math.round(shine.total))),
    data_quality: shine.dataQuality,
    source_kind: healthSource ?? 'none',
    trend_bucket: 'unknown',
    updated_at: new Date().toISOString(),
  };
}

export function requestPrivacySafeSync(): void {
  window.dispatchEvent(new Event(PRIVACY_SAFE_SYNC_EVENT));
}

export async function pullPreferencesFromSupabase(): Promise<boolean> {
  if (!hasSupabaseConfig() || !supabase) return false;

  const session = await ensureAnonymousSession();
  const userId = session?.user.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from('preferences')
    .select('display_name, gender, is_subscribed')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;

  if (data.display_name && !localStorage.getItem('ritual_user_name')) {
    localStorage.setItem('ritual_user_name', data.display_name);
  }
  if (data.gender) {
    localStorage.setItem('ritual_user_gender', data.gender);
  }
  if (data.is_subscribed !== null && data.is_subscribed !== undefined) {
    localStorage.setItem('ritual_is_subscribed', data.is_subscribed ? 'true' : 'false');
  }

  return true;
}

export async function pullReflectionFromSupabase(): Promise<boolean> {
  if (!hasSupabaseConfig() || !supabase) return false;

  const session = await ensureAnonymousSession();
  const userId = session?.user.id;
  if (!userId) return false;

  const today = todayKey();
  const { data, error } = await supabase
    .from('daily_reflections')
    .select('date, answer, reaction')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return false;

  if (data.answer && !localStorage.getItem('ritual_reflection_answer')) {
    localStorage.setItem('ritual_reflection_date', data.date);
    localStorage.setItem('ritual_reflection_answer', data.answer);
  }
  if (data.reaction && !localStorage.getItem('ritual_reflection_reaction')) {
    localStorage.setItem('ritual_reflection_reaction', data.reaction);
  }

  return true;
}

export async function pullAllFromSupabase(): Promise<void> {
  await Promise.allSettled([
    pullPreferencesFromSupabase(),
    pullReflectionFromSupabase(),
  ]);
}

export async function syncPrivacySafeState(input: PrivacySafeSyncInput = {}): Promise<SyncResult> {
  if (!hasSupabaseConfig() || !supabase) return { ok: false, skipped: 'not_configured' };

  const session = await ensureAnonymousSession();
  const userId = session?.user.id;
  if (!userId) return { ok: false, skipped: 'not_authenticated' };

  const stats = readStats(input.stats);
  const practiceEvents = buildPracticeEvents(userId, stats);
  const dailyProgress = buildDailyProgress(userId, stats, input.shine);
  const reflection = buildReflection(userId);
  const intention = buildIntention(userId);
  const preferences = buildPreferences(userId, input.onboardingCompleted);
  const healthDerived = buildHealthDerived(userId, input.shine, input.healthSource);

  if (practiceEvents.length > 0) {
    const { error } = await supabase
      .from('practice_events')
      .upsert(practiceEvents, { onConflict: 'user_id,client_event_id' });
    if (error) throw error;
  }

  if (dailyProgress.length > 0) {
    const { error } = await supabase
      .from('daily_progress')
      .upsert(dailyProgress, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  if (reflection) {
    const { error } = await supabase
      .from('daily_reflections')
      .upsert(reflection, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  if (intention) {
    const { error } = await supabase
      .from('daily_intentions')
      .upsert(intention, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  {
    const { error } = await supabase
      .from('preferences')
      .upsert(preferences, { onConflict: 'user_id' });
    if (error) throw error;
  }

  if (healthDerived) {
    const { error } = await supabase
      .from('health_daily_derived')
      .upsert(healthDerived, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  return { ok: true };
}
