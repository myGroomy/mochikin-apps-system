import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/utils/normalizePhone'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

export interface ImportCustomerRow {
  name: string
  phone: string
  branch?: string
  gender?: string
  age_range?: string
  first_order_date?: string
  description?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin', 'super_admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const rows: ImportCustomerRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    }
    if (rows.length > 10000) {
      return NextResponse.json({ error: 'Maksimal 10000 baris per import' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: existing } = await supabase.from('mycust_customers').select('phone_normalized')
    const seen = new Set<string>()
    for (const r of existing || []) {
      if (r.phone_normalized) {
        seen.add(r.phone_normalized)
        seen.add(r.phone_normalized.replace(/^0/, ''))
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const toInsert: Record<string, unknown>[] = []

    rows.forEach((r, i) => {
      const line = i + 2
      const name = r.name?.trim() || ''
      const rawPhone = r.phone?.trim() || ''

      if (!name) {
        errors.push(`Baris ${line}: Nama wajib diisi`)
        skipped++
        return
      }

      const normalized = normalizePhone(rawPhone)
      if (!normalized) {
        errors.push(`Baris ${line}: Nomor telepon tidak valid (${rawPhone || 'kosong'})`)
        skipped++
        return
      }

      if (seen.has(normalized) || seen.has(normalized.replace(/^0/, ''))) {
        skipped++
        return
      }

      seen.add(normalized)
      seen.add(normalized.replace(/^0/, ''))

      const branch = r.branch?.trim() || ''
      toInsert.push({
        name,
        phone: normalized,
        phone_normalized: normalized,
        branch: branch || null,
        first_order_date: r.first_order_date?.trim() || today,
        description: r.description?.trim() || null,
        age_range: r.age_range?.trim() || null,
        gender: r.gender?.trim() || null,
        order_count: 0,
        aliases: [],
        branch_memberships: branch ? [branch] : [],
      })
      imported++
    })

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('mycust_customers').insert(toInsert)
      if (insertErr) {
        throw new Error(`Gagal menyimpan data import customer: ${insertErr.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 20),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal import customers'
    console.error('Error importing customers:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
