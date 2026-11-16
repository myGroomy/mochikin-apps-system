import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseAdmin: SupabaseClient | null = null

/**
 * Mendapatkan instance Supabase client server-side dengan service role key
 * untuk query PostgreSQL server-side. Service-role key melewati RLS dan tidak boleh
 * digunakan di client atau sebelum otorisasi request ditegakkan.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !key) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus disetel di server.')
  }

  supabaseAdmin = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseAdmin
}
