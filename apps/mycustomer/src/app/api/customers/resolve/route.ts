import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { resolveCustomer } from '@/lib/customerRepository'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!phone || !name) {
      return NextResponse.json({ error: 'Nomor telepon dan nama wajib diisi' }, { status: 400 })
    }

    const requestedBranch = typeof body.branch === 'string' ? body.branch.trim() : ''
    const isPetugas = auth.user.role === 'petugas' || auth.user.role === 'kasir'
    const branch = isPetugas ? auth.user.branch : requestedBranch || auth.user.branch

    const result = await resolveCustomer({
      phone,
      name,
      firstOrderDate: body.first_order_date,
      branch,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memproses customer'
    console.error('Error resolving customer:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
