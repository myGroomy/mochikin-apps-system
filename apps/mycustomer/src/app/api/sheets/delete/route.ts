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

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin', 'super_admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { sheet, id } = body

    if (!sheet || !ALLOWED_SHEETS[sheet] || !id) {
      return NextResponse.json({ error: 'Missing sheet or id parameter' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (sheet === 'customers') {
      const { error } = await supabase.from('mycust_customers').delete().eq('id', id)
      if (error) throw error
    } else if (sheet === 'orders') {
      const { error } = await supabase.from('mycust_orders').delete().eq('id', id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete row'
    console.error('Error deleting row:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
