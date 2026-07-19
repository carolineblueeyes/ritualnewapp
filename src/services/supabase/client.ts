import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export const supabase: SupabaseClient | null = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export async function ensureAnonymousSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn('[Supabase] Failed to read session:', sessionError);
  }
  if (sessionData.session) return sessionData.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[Supabase] Anonymous sign-in failed:', error);
    return null;
  }

  return data.session;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const session = await ensureAnonymousSession();
  return session?.access_token ?? null;
}
