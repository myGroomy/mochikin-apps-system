import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedAnon: SupabaseClient | null = null;
let cachedAdmin: SupabaseClient | null = null;

/**
 * Lazy singleton anon client (browser / public reads through RLS).
 */
export function getSupabaseAnon(): SupabaseClient {
  if (cachedAnon) return cachedAnon;
  cachedAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}

/**
 * Lazy singleton service-role client (backend only).
 * Never expose this client to the browser bundle.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

/**
 * Server-side client bound to a user's JWT (RLS applies; auth.jwt() claims available).
 * Falls back to the anon key when no JWT is supplied.
 */
export function createServerSupabaseClient(jwt?: string): SupabaseClient {
  const client = getSupabaseAnon();
  if (!jwt) return client;
  // Per-request client via headers is handled by callers that pass a JWT context.
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isAdminConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}
