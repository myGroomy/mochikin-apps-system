import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { updateOrder } from '@/lib/customerRepository'

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { order_id, is_followed_up } = body

    if (!order_id || typeof is_followed_up !== 'boolean') {
      return NextResponse.json(
        { error: 'order_id (string) dan is_followed_up (boolean) wajib diisi' },
        { status: 400 }
      )
    }

    const followed_up_at = is_followed_up ? new Date().toISOString() : undefined

    await updateOrder(order_id, {
      is_followed_up,
      followed_up_at,
    })

    return NextResponse.json({
      success: true,
      order_id,
      is_followed_up,
      followed_up_at: followed_up_at || null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status order follow up'
    console.error('Error updating order follow up:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
