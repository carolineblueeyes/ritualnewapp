import type { Provider, Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from './client';

export type AuthProvider = 'apple' | 'google';

export interface EmailAuthResult {
  user: User | null;
  session: Session | null;
}

export function getAuthRedirectTo(): string {
  return window.location.origin;
}

export function getAuthDisplayName(user: User | null): string {
  if (!user) return 'Гость Ritual';

  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : '';
  const name = typeof metadata.name === 'string' ? metadata.name : '';

  if (fullName.trim()) return fullName.trim();
  if (name.trim()) return name.trim();
  if (user.email) return user.email;
  if (user.is_anonymous) return 'Гость Ritual';

  return 'Пользователь Ritual';
}

export async function getCurrentAuthUser(): Promise<User | null> {
  if (!hasSupabaseConfig() || !supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getCurrentAuthSession(): Promise<Session | null> {
  if (!hasSupabaseConfig() || !supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export function onAuthChanged(callback: (session: Session | null) => void): () => void {
  if (!hasSupabaseConfig() || !supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  if (!hasSupabaseConfig() || !supabase) {
    throw new Error('Supabase не настроен');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signUpWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  if (!hasSupabaseConfig() || !supabase) {
    throw new Error('Supabase не настроен');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectTo(),
    },
  });

  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  if (!hasSupabaseConfig() || !supabase) {
    throw new Error('Supabase не настроен');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: getAuthRedirectTo(),
    },
  });

  if (error) throw error;
}

export async function signOutAuth(): Promise<void> {
  if (!hasSupabaseConfig() || !supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
