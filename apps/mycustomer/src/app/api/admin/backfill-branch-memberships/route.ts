import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin', 'super_admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const apply = body.apply === true
    const supabase = getSupabase()

    const [custRes, ordRes] = await Promise.all([
      supabase.from('mycust_customers').select('id, branch, branch_memberships'),
      supabase.from('mycust_orders').select('customer_id, branch'),
    ])

    const customers = custRes.data || []
    const orders = ordRes.data || []

    const branchesByCustomer = new Map<string, Set<string>>()
    for (const o of orders) {
      if (!o.customer_id || !o.branch) continue
      const bSet = branchesByCustomer.get(o.customer_id) || new Set<string>()
      bSet.add(o.branch.trim())
      branchesByCustomer.set(o.customer_id, bSet)
    }

    const updates: Array<{ customer_id: string; branches: string[] }> = []
    for (const c of customers) {
      const orderBranches = Array.from(branchesByCustomer.get(c.id) || [])
      const initial = Array.isArray(c.branch_memberships) ? c.branch_memberships : []
      const merged = Array.from(new Set([...initial, ...(c.branch ? [c.branch] : []), ...orderBranches])).filter(Boolean)
      if (merged.length !== initial.length || !initial.every((b) => merged.includes(b))) {
        updates.push({ customer_id: c.id, branches: merged })
      }
    }

    if (apply && updates.length > 0) {
      for (const u of updates) {
        await supabase.from('mycust_customers').update({ branch_memberships: u.branches }).eq('id', u.customer_id)
      }
    }

    return NextResponse.json({
      success: true,
      dry_run: !apply,
      total_customers: customers.length,
      customers_to_update: updates.length,
      updates: updates.slice(0, 50),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal backfill branch memberships'
    console.error('Error backfilling branch memberships:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
