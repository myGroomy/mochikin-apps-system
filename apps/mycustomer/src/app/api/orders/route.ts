import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { createOrder } from '@/lib/customerRepository'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const {
      customer_id,
      order_date,
      channel,
      raw_phone_input,
      branch: requestedBranch,
      alias_name,
      usia,
      jenis_kelamin,
    } = body

    if (!customer_id || !order_date || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, order_date, channel' },
        { status: 400 }
      )
    }

    const isPetugas = auth.user.role === 'petugas' || auth.user.role === 'kasir'
    const branch = isPetugas
      ? auth.user.branch
      : (typeof requestedBranch === 'string' ? requestedBranch.trim() : '') || auth.user.branch

    if (!branch) {
      return NextResponse.json({ error: 'Cabang order wajib dipilih' }, { status: 400 })
    }

    const order = await createOrder({
      customer_id,
      order_date,
      channel,
      raw_phone_input,
      branch,
      alias_name,
      usia,
      jenis_kelamin,
    })

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_count: 1,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat order'
    console.error('Error creating order:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
