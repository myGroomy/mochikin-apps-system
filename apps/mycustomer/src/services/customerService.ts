import { getCustomerRows, getOrderRows, clearDataCache } from './dataService'
import { normalizePhone } from '@/utils/normalizePhone'
import type { Customer, CustomerWithStats, PaginatedResponse, CustomerAlias } from '@/types'

function toCustomer(row: Record<string, string>): Customer {
  let aliases: CustomerAlias[] = []
  let branchMemberships: string[] = []
  try {
    const parsed = JSON.parse(row.aliases || '[]')
    if (Array.isArray(parsed)) aliases = parsed
  } catch {
    if (row.aliases) aliases = [{ name: row.aliases, branch: '', first_seen_at: '', last_seen_at: '' }]
  }
  try {
    const parsed = JSON.parse(row.branch_memberships || '[]')
    if (Array.isArray(parsed)) branchMemberships = parsed.filter((branch): branch is string => typeof branch === 'string')
  } catch {
    branchMemberships = []
  }

  return {
    id: row.id,
    phone_normalized: row.phone_normalized || row.phone || '',
    name: row.name || '',
    first_order_date: row.first_order_date || '',
    created_at: row.created_at || row.registered_at || '',
    branch: row.branch || '',
    order_count: parseInt(row.order_count || row.total_orders || '0', 10),
    description: row.description || '',
    age_range: row.age_range || '',
    usia: row.usia || row.age_range || '',
    gender: row.gender || '',
    jenis_kelamin: row.jenis_kelamin || row.gender || '',
    is_followed_up: row.is_followed_up === 'true' || row.is_followed_up === 'TRUE',
    followed_up_at: row.followed_up_at || '',
    aliases,
    branch_memberships: branchMemberships,
  }
}

async function requestJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status})`)
  return data
}

function paginate<T>(data: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = page * pageSize
  return {
    data: data.slice(start, start + pageSize),
    count: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  }
}

export async function resolveCustomer(
  phone: string,
  name: string,
  firstOrderDate?: string,
  branch?: string,
): Promise<{ customer_id: string; phone_normalized: string; name: string; created: boolean; has_other_branch_activity?: boolean }> {
  return requestJson('/api/customers/resolve', 'POST', {
    phone,
    name,
    first_order_date: firstOrderDate,
    branch,
  })
}

export async function searchCustomers(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<PaginatedResponse<CustomerWithStats>> {
  const customers = await getCustomerRows()
  const q = query.toLowerCase()
  const qNoZero = q.startsWith('0') ? q.slice(1) : q
  const filtered = customers.filter((row) => {
    const customer = toCustomer(row)
    const phone = customer.phone_normalized || ''
    return customer.name.toLowerCase().includes(q) ||
      phone.includes(q) || phone.includes(qNoZero) ||
      customer.aliases?.some((alias) => typeof alias.name === 'string' && alias.name.toLowerCase().includes(q)) ||
      (customer.usia || '').toLowerCase().includes(q) ||
      (customer.gender || '').toLowerCase().includes(q) ||
      (customer.jenis_kelamin || '').toLowerCase().includes(q)
  }).map((row) => {
    const customer = toCustomer(row)
    return {
      ...customer,
      order_count: customer.order_count || 0,
      last_order_date: customer.first_order_date,
      retention_status: 'active' as const,
      orders: [],
    }
  })
  return paginate(filtered, page, pageSize)
}

export async function getCustomerById(id: string): Promise<CustomerWithStats | null> {
  const [customers, orders] = await Promise.all([getCustomerRows(), getOrderRows()])
  const row = customers.find((customer) => customer.id === id)
  if (!row) return null

  const customerOrders = orders
    .filter((order) => order.customer_id === id)
    .map((order) => ({ order_date: order.order_date, channel: order.channel, branch: order.branch }))
  const customer = toCustomer(row)
  const lastOrderDate = customerOrders.reduce(
    (latest, order) => order.order_date > latest ? order.order_date : latest,
    customer.first_order_date,
  )

  return {
    ...customer,
    order_count: customerOrders.length || customer.order_count || 0,
    last_order_date: lastOrderDate,
    retention_status: 'active',
    orders: customerOrders,
  }
}

export async function getCustomersWithStats(
  page = 0,
  pageSize = 20,
): Promise<PaginatedResponse<CustomerWithStats>> {
  const [customers, orders] = await Promise.all([getCustomerRows(), getOrderRows()])
  const ordersByCustomer = new Map<string, Array<{ order_date: string; channel: string; branch?: string }>>()
  for (const order of orders) {
    const current = ordersByCustomer.get(order.customer_id) || []
    current.push({ order_date: order.order_date, channel: order.channel, branch: order.branch })
    ordersByCustomer.set(order.customer_id, current)
  }

  const result = customers.map((row) => {
    const customer = toCustomer(row)
    const customerOrders = ordersByCustomer.get(row.id) || []
    const lastOrderDate = customerOrders.reduce(
      (latest, order) => order.order_date > latest ? order.order_date : latest,
      customer.first_order_date,
    )
    return {
      ...customer,
      order_count: customerOrders.length || customer.order_count || 0,
      last_order_date: lastOrderDate,
      retention_status: 'active' as const,
      orders: customerOrders,
    }
  })
  return paginate(result, page, pageSize)
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const normalized = normalizePhone(phone) || ''
  const withoutLeadingZero = normalized.startsWith('0') ? normalized.slice(1) : normalized
  const rows = await getCustomerRows()
  const row = rows.find((customer) => {
    const stored = customer.phone_normalized || customer.phone || ''
    return stored === normalized || stored === withoutLeadingZero
  })
  return row ? toCustomer(row) : null
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
  const phone = normalizePhone(customer.phone_normalized)
  if (!phone) throw new Error('Format nomor telepon tidak valid')
  if (await findCustomerByPhone(phone)) throw new Error('Customer with this phone already exists')

  const payload = await requestJson('/api/customers', 'POST', {
    name: customer.name,
    phone,
    branch: customer.branch || '',
    notes: customer.description || '',
  })
  clearDataCache()
  return toCustomer({
    ...payload.data,
    phone_normalized: payload.data.phone_normalized || phone,
    first_order_date: payload.data.first_order_date || customer.first_order_date,
  })
}

export async function updateCustomer(
  id: string,
  updates: Partial<Pick<Customer, 'name' | 'phone_normalized' | 'age_range' | 'usia' | 'gender' | 'jenis_kelamin' | 'description' | 'aliases'>>,
): Promise<Customer> {
  const body: Record<string, unknown> = { id }
  if (updates.name !== undefined) body.name = updates.name.trim()
  if (updates.phone_normalized !== undefined) body.phone_normalized = normalizePhone(updates.phone_normalized)
  if (updates.description !== undefined) body.description = updates.description
  if (updates.age_range !== undefined) body.usia = updates.age_range
  if (updates.usia !== undefined) body.usia = updates.usia
  if (updates.gender !== undefined) body.jenis_kelamin = updates.gender
  if (updates.jenis_kelamin !== undefined) body.jenis_kelamin = updates.jenis_kelamin
  if (updates.aliases !== undefined) body.aliases = updates.aliases
  await requestJson('/api/customers/update', 'PATCH', body)
  clearDataCache('customers')
  const updated = (await getCustomerRows()).find((row) => row.id === id)
  if (!updated) throw new Error('Customer tidak ditemukan setelah diperbarui')
  return toCustomer(updated)
}

export async function updateCustomerProfile(
  id: string,
  payload: { aliases?: string; usia?: string; jenis_kelamin?: string },
): Promise<Customer> {
  await requestJson('/api/customers/update', 'PATCH', { id, ...payload })
  clearDataCache('customers')
  const updated = (await getCustomerRows()).find((row) => row.id === id)
  if (!updated) throw new Error('Customer tidak ditemukan setelah diperbarui')
  return toCustomer(updated)
}

export async function updateCustomerAliases(id: string, aliases: CustomerAlias[]): Promise<Customer> {
  return updateCustomer(id, { aliases })
}
