import { randomBytes, scryptSync } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

const userInput = z.object({
  id: z.string().uuid().optional(),
  username: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(254),
  display_name: z.string().trim().min(1).max(120),
  pin: z.string().regex(/^\d{6}$/).optional(),
  role: z.enum(['admin', 'petugas', 'kasir']),
  branch: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/),
})

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}$${scryptSync(pin, salt, 32).toString('hex')}`
}

function toAppRole(role: string): 'admin' | 'petugas' {
  return role === 'super_admin' || role === 'role_admin' ? 'admin' : 'petugas'
}

async function findBranchId(code: string) {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id')
    .eq('code', code)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data?.id
}

export async function GET() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const { data, error } = await getSupabase()
      .from('people')
      .select('id, username, email, name, role, created_at, branches(code)')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('username')
    if (error) throw error

    return NextResponse.json({
      data: (data || []).map((person) => {
        const branch = Array.isArray(person.branches) ? person.branches[0] : person.branches
        return {
          id: person.id,
          username: person.username || '',
          email: person.email || '',
          display_name: toAppRole(person.role) === 'admin' ? 'Admin' : person.name,
          pin: '',
          role: toAppRole(person.role),
          created_at: person.created_at || '',
          branch: branch?.code || '',
        }
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const parsed = userInput.extend({ pin: z.string().regex(/^\d{6}$/) }).safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Data user tidak valid' }, { status: 400 })

    const branchId = await findBranchId(parsed.data.branch)
    if (!branchId) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 })

    const { data, error } = await getSupabase()
      .from('people')
      .insert({
        username: parsed.data.username,
        email: parsed.data.email,
        name: parsed.data.display_name,
        pin_hash: hashPin(parsed.data.pin),
        role: parsed.data.role === 'admin' ? 'role_admin' : 'staff',
        branch_id: branchId,
        created_by: auth.user.id,
      })
      .select('id')
      .single()
    if (error?.code === '23505') return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 409 })
    if (error) throw error

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambah user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const parsed = userInput.safeParse(await request.json())
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'ID dan data user wajib valid' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: current, error: currentError } = await supabase
      .from('people')
      .select('role')
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (currentError) throw currentError
    if (!current) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    if (current.role === 'super_admin') {
      return NextResponse.json({ error: 'Akun super admin dikelola melalui portal pusat' }, { status: 403 })
    }
    if (current.role === 'role_admin' && parsed.data.role !== 'admin') {
      const { count, error } = await supabase
        .from('people')
        .select('id', { count: 'exact', head: true })
        .in('role', ['role_admin', 'super_admin'])
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      if ((count || 0) <= 1) return NextResponse.json({ error: 'Minimal harus ada satu admin aktif' }, { status: 409 })
    }

    const branchId = await findBranchId(parsed.data.branch)
    if (!branchId) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 })

    const updates: Record<string, unknown> = {
      username: parsed.data.username,
      email: parsed.data.email,
      name: parsed.data.display_name,
      role: parsed.data.role === 'admin' ? 'role_admin' : 'staff',
      branch_id: branchId,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }
    if (parsed.data.pin) updates.pin_hash = hashPin(parsed.data.pin)

    const { data, error } = await supabase
      .from('people')
      .update(updates)
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error?.code === '23505') return NextResponse.json({ error: 'Username atau email sudah digunakan' }, { status: 409 })
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'ID user tidak valid' }, { status: 400 })
    }
    if (id === auth.user.id) return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri' }, { status: 409 })

    const supabase = getSupabase()
    const { data: current, error: currentError } = await supabase
      .from('people')
      .select('role')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (currentError) throw currentError
    if (!current) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    if (current.role === 'super_admin') {
      return NextResponse.json({ error: 'Akun super admin dikelola melalui portal pusat' }, { status: 403 })
    }

    if (current.role === 'role_admin') {
      const { count, error } = await supabase
        .from('people')
        .select('id', { count: 'exact', head: true })
        .in('role', ['role_admin', 'super_admin'])
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      if ((count || 0) <= 1) return NextResponse.json({ error: 'Minimal harus ada satu admin aktif' }, { status: 409 })
    }

    const { error } = await supabase
      .from('people')
      .update({ status: 'inactive', deleted_at: new Date().toISOString(), updated_by: auth.user.id })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw error
    const { error: membershipError } = await supabase
      .from('branch_members')
      .update({ is_active: false, removed_at: new Date().toISOString() })
      .eq('person_id', id)
      .eq('is_active', true)
    if (membershipError) throw membershipError

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menonaktifkan user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
