import { Redis } from '@upstash/redis'
import { getSheets, getSpreadsheetId, requestWithRetry } from './sheetsServer'

/**
 * Cache server-side (Upstash Redis) untuk pembacaan sheet Google Sheets.
 *
 * Kebijakan keamanan (lihat plan-database.md §6.3):
 * 1. Hanya cache data RAW (baris apa adanya, SEBELUM filter role/branch).
 *    Filter otorisasi tetap dijalankan per-request di route masing-masing.
 * 2. TTL pendek (default 30 detik) sebagai jaring pengaman; invalidasi di
 *    write route adalah pelengkap, bukan satu-satunya mekanisme.
 * 3. Sheet `users` TIDAK pernah di-cache (berisi PIN).
 * 4. Jika env Upstash tidak diset, semua fungsi menjadi no-op dan membaca
 *    langsung ke Google Sheets (perilaku lama tanpa Redis).
 */

const TTL_SECONDS = Math.max(0, Number(process.env.SHEET_CACHE_TTL_SECONDS ?? 120))
const KEY_PREFIX = 'mycustomer:sheet:'

// Sheet yang boleh di-cache. `users` sengaja tidak ada di daftar ini.
const CACHEABLE_SHEETS = new Set([
  'customers',
  'orders',
  'settings',
  'branches',
  'customer_branches',
])

let redisClient: Redis | null | undefined

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    redisClient = null
    return redisClient
  }
  redisClient = new Redis({ url, token, automaticDeserialization: false })
  return redisClient
}

export function isSheetCacheAvailable(): boolean {
  return getRedis() !== null && TTL_SECONDS > 0
}

/**
 * Baca seluruh baris sheet (`<name>!A:Z`) dengan cache-through Redis.
 * Hasil yang di-cache adalah rows mentah; pemanggil bertanggung jawab
 * melakukan filtering otorisasi sendiri.
 */
export async function readSheetRowsCached(sheetName: string): Promise<string[][]> {
  const client = isSheetCacheAvailable() && CACHEABLE_SHEETS.has(sheetName) ? getRedis() : null
  const key = `${KEY_PREFIX}${sheetName}`

  if (client) {
    try {
      const hit = await client.get<string>(key)
      if (typeof hit === 'string') {
        const parsed: unknown = JSON.parse(hit)
        if (Array.isArray(parsed)) return parsed as string[][]
      }
    } catch {
      // Redis error → jatuh baca ke Google (selalu benar)
    }
  }

  let rows: string[][] = []

  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
    if (
      spreadsheetId &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      const response = await requestWithRetry(() =>
        getSheets().spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        })
      )
      rows = (response.data.values || []) as string[][]
    }
  } catch (err) {
    console.warn(`Could not read sheet ${sheetName} from Google Sheets:`, err)
  }

  // Graceful fallback to Supabase customers if Google Sheets returned no data
  if (
    rows.length === 0 &&
    sheetName === 'customers' &&
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
      )
      const { data: dbCustomers } = await supabase
        .from('customers')
        .select('id, name, phone, email, branch_id, created_at, status, total_purchases, branches(code)')
        .is('deleted_at', null)

      if (dbCustomers && dbCustomers.length > 0) {
        const headers = [
          'id',
          'phone_normalized',
          'name',
          'first_order_date',
          'created_at',
          'branch',
          'order_count',
          'description',
          'age_range',
          'usia',
          'gender',
          'jenis_kelamin',
          'aliases',
          'branch_memberships',
          'is_followed_up',
          'followed_up_at',
        ]
        rows = [headers]
        for (const c of dbCustomers) {
          const branchObj = Array.isArray(c.branches) ? c.branches[0] : c.branches
          rows.push([
            c.id,
            c.phone || '',
            c.name,
            c.created_at || '',
            c.created_at || '',
            branchObj?.code || 'BJ01',
            String(c.total_purchases || '0'),
            '',
            '',
            '',
            '',
            '',
            '[]',
            '[]',
            'false',
            '',
          ])
        }
      }
    } catch (dbErr) {
      console.warn('Fallback to Supabase customers failed:', dbErr)
    }
  }

  if (client) {
    try {
      await client.set(key, JSON.stringify(rows), { ex: TTL_SECONDS })
    } catch {
      // Gagal menyimpan cache tidak menggagalkan request
    }
  }
  return rows
}

/**
 * Hapus cache setelah write ke Google Sheets sukses.
 * Selalu panggil SETELAH write sukses, jangan sebelum.
 *
 * @param sheetNames sheet yang berubah; kosongkan untuk menghapus semua
 *                   sheet yang di-cache.
 */
export async function invalidateSheetCache(sheetNames?: string[]): Promise<void> {
  const client = getRedis()
  if (!client) return
  const names = sheetNames && sheetNames.length > 0
    ? sheetNames
    : [...CACHEABLE_SHEETS]
  try {
    await client.del(...names.map((name) => `${KEY_PREFIX}${name}`))
  } catch {
    // Invalidasi gagal → TTL pendek tetap menjadi jaring pengaman
  }
}
