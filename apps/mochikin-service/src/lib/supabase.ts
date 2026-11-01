import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMochikinServiceEnv } from "./env";

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with Service Role privileges
 * (bypasses RLS for authentication verification and user lookup).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const env = getMochikinServiceEnv();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  supabaseAdmin = createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}
