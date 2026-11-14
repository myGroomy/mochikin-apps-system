import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { updateCustomer } from '@/lib/customerRepository'

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { id, aliases, usia, jenis_kelamin, description, name, branch } = body

    if (!id) {
      return NextResponse.json({ error: 'id customer diperlukan' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (usia !== undefined) updates.age_range = usia
    if (jenis_kelamin !== undefined) updates.gender = jenis_kelamin
    if (aliases !== undefined) updates.aliases = aliases
    if (branch !== undefined) updates.branch = branch

    await updateCustomer(id, updates)

    return NextResponse.json({
      success: true,
      id,
      updated_fields: Object.keys(updates),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui customer'
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
