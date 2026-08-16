import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let ensureSessionPromise: Promise<string> | null = null;

/**
 * Returns a valid access token, signing in anonymously if there's no session yet.
 * Anonymous auth lets the app work immediately with no signup wall, while still
 * giving the FastAPI backend a real Supabase-issued JWT for every request. A user
 * can later upgrade this same anonymous identity to a real Google account via
 * signInWithGoogle() below without losing anything saved under it.
 */
export async function ensureSession(): Promise<string> {
  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.access_token;

      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error || !signInData.session) {
        ensureSessionPromise = null;
        throw error || new Error('Failed to start anonymous session');
      }
      return signInData.session.access_token;
    })();
  }
  return ensureSessionPromise;
}

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function isAnonymousUser(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.is_anonymous ?? true;
}

/**
 * Starts Google sign-in. If the current session is still anonymous, this upgrades
 * that exact account in place (same user_id, so every experience/job/document
 * already saved stays attached) instead of creating a brand new one. Both paths
 * redirect to Google and back to the current origin.
 */
export async function signInWithGoogle(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const redirectTo = window.location.origin;

  if (data.session?.user.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) throw error;
  }
}

/**
 * Signs out completely and reloads, so the app re-initializes with a fresh
 * anonymous session instead of leaving the previous account's cached data
 * visible (important on a shared device).
 */
export async function signOutAndReload(): Promise<void> {
  await supabase.auth.signOut();
  ensureSessionPromise = null;
  window.location.reload();
}
