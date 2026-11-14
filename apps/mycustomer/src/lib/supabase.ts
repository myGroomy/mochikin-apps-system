import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseAdmin: SupabaseClient | null = null

/**
 * Mendapatkan instance Supabase client server-side dengan service role key
 * untuk akses langsung ke database PostgreSQL (bypass RLS / Sheets).
 */
export function getSupabase(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  if (!url || !key) {
    throw new Error('Konfigurasi Supabase URL atau Key belum disetel di environment.')
  }

  supabaseAdmin = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseAdmin
}
