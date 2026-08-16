import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let ensureSessionPromise: Promise<string> | null = null;

/**
 * Returns a valid access token, signing in anonymously if there's no session yet.
 * Anonymous auth lets the app work immediately with no signup wall, while still
 * giving the FastAPI backend a real Supabase-issued JWT for every request.
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

/**
 * Starts Google sign-in. Data added before logging in stays under the anonymous
 * session and isn't carried over — signing in switches to your permanent Google
 * account's own data. Redirects to Google and back to the current origin.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) throw error;
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
