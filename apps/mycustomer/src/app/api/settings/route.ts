import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

const settingsSchema = z.object({
  storeName: z.string().max(120),
  activeDays: z.number().int().min(1).max(3650),
  atRiskDays: z.number().int().min(1).max(3650),
  waTemplate: z.string().max(5000),
  waFrequencyTemplates: z.array(z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(120),
    minOrders: z.number().int().min(1),
    maxOrders: z.number().int().min(1).nullable(),
    template: z.string().max(5000),
  })).min(1).max(50),
})

export async function GET() {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const { data, error } = await getSupabase()
      .from('mycustomer_app_settings')
      .select('settings')
      .eq('id', 'global')
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ settings: data?.settings ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat pengaturan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const parsed = settingsSchema.safeParse((await request.json()).settings)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Format pengaturan tidak valid' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('mycustomer_app_settings')
      .upsert({
        id: 'global',
        settings: parsed.data,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('settings')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, settings: data.settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
