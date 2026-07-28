import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (uses service role key for elevated access).
 *
 * Returns null if Supabase is not configured — callers must check.
 * Used by API routes for: user sync, auth verification, storage uploads.
 *
 * NOTE: The service role key bypasses RLS. Only use server-side.
 * Never expose NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY to the client.
 */

let cachedClient: SupabaseClient | null = null;
let checked = false;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (checked) return cachedClient;
  checked = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Server uses the service role key (full access, bypasses RLS).
  // Fall back to anon key if service role isn't set (read-only operations).
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedClient;
  } catch (e) {
    console.error("[Supabase] Server client init failed:", e);
    return null;
  }
}

/**
 * Verify a Supabase JWT (issued by Supabase Auth) and return the user ID.
 * Returns null if the token is invalid or Supabase isn't configured.
 *
 * Use this in API routes to authenticate requests that came through
 * Supabase Auth (instead of NextAuth).
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
