import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { updateCustomer } from '@/lib/customerRepository'

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { customer_id, is_followed_up } = body

    if (!customer_id || typeof is_followed_up !== 'boolean') {
      return NextResponse.json(
        { error: 'customer_id (string) dan is_followed_up (boolean) wajib diisi' },
        { status: 400 }
      )
    }

    const followed_up_at = is_followed_up ? new Date().toISOString() : undefined

    await updateCustomer(customer_id, {
      is_followed_up,
      followed_up_at,
    })

    return NextResponse.json({
      success: true,
      customer_id,
      is_followed_up,
      followed_up_at: followed_up_at || null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status follow up'
    console.error('Error updating customer follow up:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
