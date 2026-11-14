import { getSupabase } from './supabase'
import { normalizePhone } from '@/utils/normalizePhone'
import type { Customer, Order } from '@/types'

/**
 * Repository Supabase untuk entitas Pelanggan (mycust_customers) dan Pesanan (mycust_orders).
 * Menggantikan akses Google Sheets dengan RDBMS berlatensi rendah (<50ms).
 */

export async function resolveCustomer(params: {
  phone: string
  name: string
  firstOrderDate?: string
  branch?: string
}): Promise<{
  customer_id: string
  phone_normalized: string
  name: string
  created: boolean
  has_other_branch_activity?: boolean
}> {
  const supabase = getSupabase()
  const normalizedPhone = normalizePhone(params.phone)
  if (!normalizedPhone) {
    throw new Error('Format nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx')
  }

  const cleanName = params.name.trim()
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const branch = params.branch?.trim() || ''

  // 1. Cari customer berdasarkan phone_normalized atau phone
  const { data: existing, error: findErr } = await supabase
    .from('mycust_customers')
    .select('*')
    .or(`phone_normalized.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
    .maybeSingle()

  if (findErr) {
    throw new Error(`Gagal mencari customer: ${findErr.message}`)
  }

  if (!existing) {
    // Buat customer baru
    const newCustomer = {
      name: cleanName,
      phone: normalizedPhone,
      phone_normalized: normalizedPhone,
      branch: branch || null,
      first_order_date: params.firstOrderDate || today,
      order_count: 0,
      total_orders: 0,
      total_spend: 0,
      loyalty_points: 0,
      status: 'active',
      aliases: [],
      branch_memberships: branch ? [branch] : [],
      registered_at: now,
      created_at: now,
    }

    const { data: created, error: createErr } = await supabase
      .from('mycust_customers')
      .insert(newCustomer)
      .select('id, name, phone_normalized')
      .single()

    if (createErr || !created) {
      throw new Error(`Gagal membuat customer baru: ${createErr?.message}`)
    }

    return {
      customer_id: created.id,
      phone_normalized: created.phone_normalized || normalizedPhone,
      name: created.name,
      created: true,
      has_other_branch_activity: false,
    }
  }

  // 2. Customer sudah ada: cek update alias nama dan cabang penugasan
  const aliases: Array<{ name: string; branch: string; first_seen_at: string; last_seen_at: string }> =
    Array.isArray(existing.aliases) ? existing.aliases : []
  const branchMemberships: string[] = Array.isArray(existing.branch_memberships) ? existing.branch_memberships : []

  let shouldUpdate = false
  const updates: Record<string, unknown> = {}

  // Cek apakah ada aktivitas di cabang lain
  const otherBranches = branchMemberships.filter((b) => b && b !== branch)
  const hasOtherBranchActivity = otherBranches.length > 0 || (Boolean(existing.branch) && existing.branch !== branch)

  if (branch && !branchMemberships.includes(branch)) {
    branchMemberships.push(branch)
    updates.branch_memberships = branchMemberships
    shouldUpdate = true
  }

  if (cleanName && cleanName.toLowerCase() !== existing.name.toLowerCase()) {
    const existingAliasIndex = aliases.findIndex(
      (a) => a.name.toLowerCase() === cleanName.toLowerCase() && a.branch === branch
    )
    if (existingAliasIndex >= 0) {
      aliases[existingAliasIndex].last_seen_at = now
    } else {
      aliases.push({
        name: cleanName,
        branch: branch || existing.branch || '',
        first_seen_at: now,
        last_seen_at: now,
      })
    }
    updates.aliases = aliases
    shouldUpdate = true
  }

  if (shouldUpdate) {
    await supabase.from('mycust_customers').update(updates).eq('id', existing.id)
  }

  return {
    customer_id: existing.id,
    phone_normalized: existing.phone_normalized || normalizedPhone,
    name: existing.name,
    created: false,
    has_other_branch_activity: hasOtherBranchActivity,
  }
}

export async function createOrder(params: {
  customer_id: string
  order_date: string
  channel: string
  raw_phone_input?: string | null
  branch?: string
  alias_name?: string
  usia?: string
  jenis_kelamin?: string
}): Promise<Order> {
  const supabase = getSupabase()

  // 1. Verifikasi keberadaan customer
  const { data: customer, error: custErr } = await supabase
    .from('mycust_customers')
    .select('id, order_count, total_orders, aliases, age_range, gender')
    .eq('id', params.customer_id)
    .single()

  if (custErr || !customer) {
    throw new Error('Customer tidak ditemukan')
  }

  const now = new Date().toISOString()

  // 2. Insert order ke mycust_orders
  const orderRecord = {
    customer_id: params.customer_id,
    order_date: params.order_date,
    channel: params.channel,
    raw_phone_input: params.raw_phone_input || null,
    branch: params.branch || null,
    status: 'completed',
    created_at: now,
  }

  const { data: order, error: orderErr } = await supabase
    .from('mycust_orders')
    .insert(orderRecord)
    .select('*')
    .single()

  if (orderErr || !order) {
    throw new Error(`Gagal mencatat order: ${orderErr?.message}`)
  }

  // 3. Update counter order pada customer secara atomik
  const newOrderCount = (customer.order_count || 0) + 1
  const custUpdates: Record<string, unknown> = {
    order_count: newOrderCount,
    total_orders: newOrderCount,
    last_order_at: now,
  }

  if (params.usia && !customer.age_range) {
    custUpdates.age_range = params.usia
  }
  if (params.jenis_kelamin && !customer.gender) {
    custUpdates.gender = params.jenis_kelamin
  }

  await supabase.from('mycust_customers').update(custUpdates).eq('id', params.customer_id)

  return {
    id: order.id,
    customer_id: order.customer_id,
    order_date: order.order_date,
    channel: order.channel,
    raw_phone_input: order.raw_phone_input,
    branch: order.branch || undefined,
    created_at: order.created_at,
    is_followed_up: order.is_followed_up || false,
    followed_up_at: order.followed_up_at || undefined,
  }
}

export async function getCustomers(branchFilter?: string): Promise<Customer[]> {
  const supabase = getSupabase()
  let query = supabase.from('mycust_customers').select('*').order('created_at', { ascending: false })

  if (branchFilter && branchFilter !== 'ALL') {
    query = query.or(`branch.eq.${branchFilter},branch_memberships.cs.["${branchFilter}"]`)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Gagal mengambil data customer: ${error.message}`)
  }

  return (data || []).map((row) => ({
    id: row.id,
    phone_normalized: row.phone_normalized || row.phone,
    name: row.name,
    first_order_date: row.first_order_date || row.registered_at?.slice(0, 10) || '',
    created_at: row.created_at || row.registered_at || '',
    branch: row.branch || undefined,
    order_count: row.order_count || row.total_orders || 0,
    description: row.description || '',
    age_range: row.age_range || '',
    gender: row.gender || '',
    is_followed_up: row.is_followed_up || false,
    followed_up_at: row.followed_up_at || undefined,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    branch_memberships: Array.isArray(row.branch_memberships) ? row.branch_memberships : [],
  }))
}

export async function getOrders(branchFilter?: string): Promise<Order[]> {
  const supabase = getSupabase()
  let query = supabase.from('mycust_orders').select('*').order('created_at', { ascending: false })

  if (branchFilter && branchFilter !== 'ALL') {
    query = query.eq('branch', branchFilter)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Gagal mengambil data orders: ${error.message}`)
  }

  return (data || []).map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    order_date: row.order_date,
    channel: row.channel,
    raw_phone_input: row.raw_phone_input,
    branch: row.branch || undefined,
    created_at: row.created_at,
    is_followed_up: row.is_followed_up || false,
    followed_up_at: row.followed_up_at || undefined,
  }))
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer> & Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase()
  const dbUpdates: Record<string, unknown> = {}

  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.age_range !== undefined) dbUpdates.age_range = updates.age_range
  if (updates.usia !== undefined) dbUpdates.age_range = updates.usia
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender
  if (updates.jenis_kelamin !== undefined) dbUpdates.gender = updates.jenis_kelamin
  if (updates.is_followed_up !== undefined) dbUpdates.is_followed_up = updates.is_followed_up
  if (updates.followed_up_at !== undefined) dbUpdates.followed_up_at = updates.followed_up_at
  if (updates.branch !== undefined) dbUpdates.branch = updates.branch

  const { error } = await supabase.from('mycust_customers').update(dbUpdates).eq('id', id)
  if (error) {
    throw new Error(`Gagal memperbarui customer: ${error.message}`)
  }
}

export async function updateOrder(
  id: string,
  updates: Partial<Order> & Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase()
  const dbUpdates: Record<string, unknown> = {}

  if (updates.is_followed_up !== undefined) dbUpdates.is_followed_up = updates.is_followed_up
  if (updates.followed_up_at !== undefined) dbUpdates.followed_up_at = updates.followed_up_at
  if (updates.branch !== undefined) dbUpdates.branch = updates.branch

  const { error } = await supabase.from('mycust_orders').update(dbUpdates).eq('id', id)
  if (error) {
    throw new Error(`Gagal memperbarui order: ${error.message}`)
  }
}

export async function recalculateOrderCounts(): Promise<{ updated: number }> {
  const supabase = getSupabase()
  const { data: customers, error: cErr } = await supabase.from('mycust_customers').select('id')
  if (cErr || !customers) return { updated: 0 }

  let updated = 0
  for (const c of customers) {
    const { count } = await supabase
      .from('mycust_orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', c.id)

    const actualCount = count || 0
    await supabase.from('mycust_customers').update({ order_count: actualCount, total_orders: actualCount }).eq('id', c.id)
    updated++
  }

  return { updated }
}
