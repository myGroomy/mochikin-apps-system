import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_SHEETS: Record<string, true> = {
  customers: true,
  orders: true,
  settings: true,
  branches: true,
  users: true,
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { sheet, row } = body

    if (!sheet || !ALLOWED_SHEETS[sheet] || !row) {
      return NextResponse.json({ error: 'Missing sheet or row parameter' }, { status: 400 })
    }
    if (!['owner', 'admin', 'super_admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabase()

    if (sheet === 'customers') {
      const { error } = await supabase.from('mycust_customers').insert({
        name: row.name,
        phone: row.phone_normalized || row.phone,
        phone_normalized: row.phone_normalized || row.phone,
        branch: row.branch,
        first_order_date: row.first_order_date || new Date().toISOString().slice(0, 10),
        order_count: Number(row.order_count || 0),
        description: row.description,
        age_range: row.age_range || row.usia,
        gender: row.gender || row.jenis_kelamin,
      })
      if (error) throw error
    } else if (sheet === 'orders') {
      const { error } = await supabase.from('mycust_orders').insert({
        customer_id: row.customer_id,
        order_date: row.order_date || new Date().toISOString().slice(0, 10),
        channel: row.channel || 'dine_in',
        raw_phone_input: row.raw_phone_input,
        branch: row.branch,
      })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to append row'
    console.error('Error appending row:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
