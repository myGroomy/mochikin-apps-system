import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { updateCustomer } from '@/lib/customerRepository'
import { getSupabase } from '@/lib/supabase'
import { normalizePhone } from '@/utils/normalizePhone'

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { id, aliases, usia, jenis_kelamin, description, name, branch } = body

    if (!id) {
      return NextResponse.json({ error: 'id customer diperlukan' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: customer, error: findError } = await supabase
      .from('mycust_customers')
      .select('branch, branch_memberships')
      .eq('id', id)
      .maybeSingle()
    if (findError) throw findError
    if (!customer) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 })

    const isPetugas = auth.user.role === 'petugas' || auth.user.role === 'kasir'
    const memberships = Array.isArray(customer.branch_memberships) ? customer.branch_memberships : []
    if (isPetugas && customer.branch !== auth.user.branch && !memberships.includes(auth.user.branch)) {
      return NextResponse.json({ error: 'Tidak memiliki akses ke customer ini' }, { status: 403 })
    }
    if (branch !== undefined) {
      if (isPetugas && branch !== auth.user.branch) {
        return NextResponse.json({ error: 'Tidak dapat memindahkan customer ke cabang lain' }, { status: 403 })
      }
      const { data: activeBranch, error: branchError } = await supabase
        .from('branches')
        .select('code')
        .eq('code', branch)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle()
      if (branchError) throw branchError
      if (!activeBranch) return NextResponse.json({ error: 'Cabang tidak ditemukan atau tidak aktif' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (usia !== undefined) updates.age_range = usia
    if (jenis_kelamin !== undefined) updates.gender = jenis_kelamin
    if (aliases !== undefined) updates.aliases = aliases
    if (branch !== undefined) updates.branch = branch
    if (body.phone_normalized !== undefined) {
      const phone = normalizePhone(body.phone_normalized)
      if (!phone) return NextResponse.json({ error: 'Nomor telepon tidak valid' }, { status: 400 })
      updates.phone = phone
      updates.phone_normalized = phone
    }

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
