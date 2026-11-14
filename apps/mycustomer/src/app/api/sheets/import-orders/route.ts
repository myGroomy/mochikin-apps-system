import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/utils/normalizePhone'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

export interface ImportOrderRow {
  phone: string
  name?: string
  order_date: string
  channel: string
  branch?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin', 'super_admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const rows: ImportOrderRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: allCustomers } = await supabase.from('mycust_customers').select('id, phone_normalized, name, branch')
    const customerByPhone = new Map<string, { id: string; name: string; branch?: string }>()
    for (const c of allCustomers || []) {
      if (c.phone_normalized) {
        customerByPhone.set(c.phone_normalized, c)
      }
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const ordersToInsert: Record<string, unknown>[] = []
    const customerOrderCounts = new Map<string, number>()

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const line = i + 2
      const rawPhone = r.phone?.trim() || ''
      const normalized = normalizePhone(rawPhone)

      if (!normalized) {
        errors.push(`Baris ${line}: Nomor telepon tidak valid (${rawPhone || 'kosong'})`)
        skipped++
        continue
      }

      if (!r.order_date || !r.channel) {
        errors.push(`Baris ${line}: order_date dan channel wajib diisi`)
        skipped++
        continue
      }

      let cust = customerByPhone.get(normalized)
      if (!cust) {
        // Auto-create customer jika belum ada
        const { data: newCust, error: newCustErr } = await supabase
          .from('mycust_customers')
          .insert({
            name: r.name?.trim() || `Pelanggan ${normalized.slice(-4)}`,
            phone: normalized,
            phone_normalized: normalized,
            branch: r.branch || null,
            first_order_date: r.order_date,
            order_count: 0,
            branch_memberships: r.branch ? [r.branch] : [],
          })
          .select('id, name, branch')
          .single()

        if (newCustErr || !newCust) {
          errors.push(`Baris ${line}: Gagal membuat customer baru: ${newCustErr?.message}`)
          skipped++
          continue
        }
        cust = newCust
        customerByPhone.set(normalized, cust)
      }

      ordersToInsert.push({
        customer_id: cust.id,
        order_date: r.order_date,
        channel: r.channel,
        raw_phone_input: rawPhone,
        branch: r.branch || cust.branch || null,
        status: 'completed',
      })

      customerOrderCounts.set(cust.id, (customerOrderCounts.get(cust.id) || 0) + 1)
      imported++
    }

    if (ordersToInsert.length > 0) {
      const { error: insErr } = await supabase.from('mycust_orders').insert(ordersToInsert)
      if (insErr) {
        throw new Error(`Gagal menyimpan order import: ${insErr.message}`)
      }

      // Update counter order customer
      for (const [custId, addCount] of customerOrderCounts.entries()) {
        const { data: c } = await supabase.from('mycust_customers').select('order_count').eq('id', custId).single()
        const newCount = (c?.order_count || 0) + addCount
        await supabase.from('mycust_customers').update({ order_count: newCount, total_orders: newCount }).eq('id', custId)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 20),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal import orders'
    console.error('Error importing orders:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
