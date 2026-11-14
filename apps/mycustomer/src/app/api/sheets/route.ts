import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { getCustomers, getOrders } from '@/lib/customerRepository'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_SHEETS: Record<string, true> = {
  customers: true,
  orders: true,
  settings: true,
  branches: true,
  users: true,
  customer_branches: true,
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const sheet = searchParams.get('sheet')

    if (!sheet) {
      return NextResponse.json({ error: 'Missing sheet parameter' }, { status: 400 })
    }
    if (!ALLOWED_SHEETS[sheet]) {
      return NextResponse.json({ error: `Sheet tidak valid: ${sheet}` }, { status: 400 })
    }

    const isPetugas = auth.user.role === 'petugas' || auth.user.role === 'kasir'
    const branchFilter = isPetugas ? auth.user.branch : undefined

    if (sheet === 'customers') {
      const customers = await getCustomers(branchFilter)
      return NextResponse.json({ data: customers })
    }

    if (sheet === 'orders') {
      const orders = await getOrders(branchFilter)
      return NextResponse.json({ data: orders })
    }

    const supabase = getSupabase()

    if (sheet === 'branches') {
      const { data: branches } = await supabase
        .from('branches')
        .select('id, code, name, city')
        .eq('status', 'active')
        .is('deleted_at', null)

      const formatted = (branches || []).map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        branch: b.code,
        branch_name: b.name,
      }))
      return NextResponse.json({ data: formatted })
    }

    if (sheet === 'users') {
      if (auth.user.role !== 'admin' && auth.user.role !== 'owner' && auth.user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { data: users } = await supabase
        .from('people')
        .select('id, username, name, role, branch_id, branches(code, name)')
        .eq('status', 'active')
        .is('deleted_at', null)

      const formatted = (users || []).map(
        (u: { id: string; username: string | null; name: string; role: string; branches?: unknown }) => {
          const branchInfo = Array.isArray(u.branches)
            ? (u.branches[0] as { code?: string } | undefined)
            : (u.branches as { code?: string } | undefined)
          return {
            id: u.id,
            username: u.username || '',
            name: u.name,
            role: u.role,
            branch: branchInfo?.code || '',
          }
        }
      )
      return NextResponse.json({ data: formatted })
    }

    if (sheet === 'settings') {
      return NextResponse.json({
        data: [
          { key: 'retention_active_days', value: '30' },
          { key: 'retention_at_risk_days', value: '60' },
          { key: 'daily_wa_limit', value: '15' },
        ],
      })
    }

    return NextResponse.json({ data: [] })
  } catch (error) {
    console.error('Error reading data:', error)
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 })
  }
}
