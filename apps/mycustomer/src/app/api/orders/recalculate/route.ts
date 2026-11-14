import { NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { recalculateOrderCounts } from '@/lib/customerRepository'

export async function POST() {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const result = await recalculateOrderCounts()
    return NextResponse.json({
      success: true,
      message: `Berhasil menghitung ulang order count untuk ${result.updated} customer.`,
      updated: result.updated,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghitung ulang order count'
    console.error('Error recalculating order count:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
