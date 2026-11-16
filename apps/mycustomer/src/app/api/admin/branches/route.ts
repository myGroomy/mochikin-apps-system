import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

const branchInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
})

export async function GET() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const { data, error } = await getSupabase()
      .from('branches')
      .select('id, code, name, created_at, address, city, status')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('code')
    if (error) throw error

    return NextResponse.json({
      data: (data || []).map((branch) => ({
        ...branch,
        is_active: branch.status === 'active',
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat cabang'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const parsed = branchInput.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Kode, nama, dan kota cabang tidak valid' }, { status: 400 })

    const { data, error } = await getSupabase()
      .from('branches')
      .insert({
        code: parsed.data.code,
        name: parsed.data.name,
        city: parsed.data.city,
        created_by: auth.user.id,
      })
      .select('id, code, name, created_at, address, city, status')
      .single()
    if (error?.code === '23505') return NextResponse.json({ error: 'Kode cabang sudah digunakan' }, { status: 409 })
    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambah cabang'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const parsed = branchInput.safeParse(await request.json())
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'ID, kode, nama, dan kota cabang wajib valid' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('branches')
      .update({
        code: parsed.data.code,
        name: parsed.data.name,
        city: parsed.data.city,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error?.code === '23505') return NextResponse.json({ error: 'Kode cabang sudah digunakan' }, { status: 409 })
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui cabang'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'ID cabang tidak valid' }, { status: 400 })
    }

    const supabase = getSupabase()
    const [{ count: peopleCount, error: peopleError }, { count: memberCount, error: memberError }] = await Promise.all([
      supabase.from('people').select('id', { count: 'exact', head: true }).eq('branch_id', id).is('deleted_at', null),
      supabase.from('branch_members').select('person_id', { count: 'exact', head: true }).eq('branch_id', id).eq('is_active', true),
    ])
    if (peopleError) throw peopleError
    if (memberError) throw memberError
    if ((peopleCount || 0) > 0 || (memberCount || 0) > 0) {
      return NextResponse.json({ error: 'Pindahkan semua user dari cabang ini sebelum menonaktifkannya' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('branches')
      .update({ status: 'inactive', deleted_at: new Date().toISOString(), updated_by: auth.user.id })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menonaktifkan cabang'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
