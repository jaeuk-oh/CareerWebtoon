import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let ensureSessionPromise: Promise<string> | null = null;

/**
 * Returns a valid access token, signing in anonymously if there's no session yet.
 * Anonymous auth lets the app keep its "just enter a name" UX while still giving
 * the FastAPI backend a real Supabase-issued JWT to authenticate every request with.
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
