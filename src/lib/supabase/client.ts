"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * Returns null if Supabase is not configured — callers must check.
 * The app falls back to NextAuth + Prisma when Supabase is unavailable.
 *
 * Usage:
 *   import { getSupabaseClient } from "@/lib/supabase/client";
 *   const supabase = getSupabaseClient();
 *   if (!supabase) {
 *     // Fall back to demo mode / NextAuth
 *   }
 */

let cachedClient: SupabaseClient | null = null;
let checked = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (checked) return cachedClient;
  checked = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null; // Supabase not configured — fall back
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (e) {
    console.warn("[Supabase] Client init failed:", e);
    return null;
  }
}

/**
 * Convenience: returns true if Supabase is available on the client.
 */
export function isSupabaseReady(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Sign in with Google via Supabase OAuth.
 * Redirects the browser to Google's consent screen.
 *
 * Returns false if Supabase isn't configured (caller should fall back
 * to NextAuth's Google provider or show an error).
 */
export async function signInWithGoogleSupabase(returnPath = "/"): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${returnPath}`,
    },
  });

  if (error) {
    console.error("[Supabase] Google OAuth failed:", error);
    return false;
  }
  return true; // Browser will redirect to Google
}
