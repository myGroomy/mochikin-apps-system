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

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { sheet, row } = body

    if (!sheet || !ALLOWED_SHEETS[sheet] || !row || !row.id) {
      return NextResponse.json({ error: 'Missing sheet or row id parameter' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (sheet === 'customers') {
      const updates: Record<string, unknown> = {}
      if (row.name !== undefined) updates.name = row.name
      if (row.phone !== undefined) updates.phone = row.phone
      if (row.phone_normalized !== undefined) updates.phone_normalized = row.phone_normalized
      if (row.branch !== undefined) updates.branch = row.branch
      if (row.description !== undefined) updates.description = row.description
      if (row.age_range !== undefined) updates.age_range = row.age_range
      if (row.gender !== undefined) updates.gender = row.gender
      if (row.is_followed_up !== undefined) updates.is_followed_up = row.is_followed_up
      if (row.followed_up_at !== undefined) updates.followed_up_at = row.followed_up_at

      const { error } = await supabase.from('mycust_customers').update(updates).eq('id', row.id)
      if (error) throw error
    } else if (sheet === 'orders') {
      const updates: Record<string, unknown> = {}
      if (row.channel !== undefined) updates.channel = row.channel
      if (row.branch !== undefined) updates.branch = row.branch
      if (row.is_followed_up !== undefined) updates.is_followed_up = row.is_followed_up
      if (row.followed_up_at !== undefined) updates.followed_up_at = row.followed_up_at

      const { error } = await supabase.from('mycust_orders').update(updates).eq('id', row.id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update row'
    console.error('Error updating row:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
