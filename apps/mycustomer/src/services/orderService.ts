import { getSheetData } from './sheetsService'
import type { Order, OrderWithCustomer, PaginatedResponse } from '@/types'

const ORDERS_SHEET = 'orders'
const CUSTOMERS_SHEET = 'customers'

function toOrder(row: Record<string, string>): Order {
  return {
    id: row.id,
    customer_id: row.customer_id,
    order_date: row.order_date,
    channel: row.channel as Order['channel'],
    raw_phone_input: row.raw_phone_input || null,
    created_at: row.created_at,
    branch: row.branch || '',
    is_followed_up: row.is_followed_up === 'TRUE' || row.is_followed_up === 'true',
    followed_up_at: row.followed_up_at || '',
  }
}

function paginate<T>(data: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = page * pageSize
  const end = start + pageSize
  return {
    data: data.slice(start, end),
    count: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  }
}

export interface CreateOrderInput {
  customer_id: string
  order_date: string
  channel: Order['channel']
  raw_phone_input?: string | null
  branch?: string
  alias_name?: string
}

export async function createOrder(order: CreateOrderInput): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: order.customer_id,
      order_date: order.order_date,
      channel: order.channel,
      raw_phone_input: order.raw_phone_input || '',
      branch: order.branch || '',
      alias_name: order.alias_name || '',
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Sesi tidak valid, silakan login ulang')
    }
    throw new Error(data.error || 'Gagal menyimpan order')
  }

  return {
    id: data.order_id,
    customer_id: order.customer_id,
    order_date: order.order_date,
    channel: order.channel,
    raw_phone_input: order.raw_phone_input || '',
    created_at: new Date().toISOString(),
  }
}

export async function getOrdersByCustomer(
  customerId: string,
  page = 0,
  pageSize = 20,
): Promise<PaginatedResponse<Order>> {
  const orders = await getSheetData(ORDERS_SHEET)
  const customerOrders = orders
    .filter(o => o.customer_id === customerId)
    .map(toOrder)
    .sort((a, b) => b.order_date.localeCompare(a.order_date))

  return paginate(customerOrders, page, pageSize)
}

export async function getOrdersByDate(date: string): Promise<OrderWithCustomer[]> {
  const orders = await getSheetData(ORDERS_SHEET)
  const customers = await getSheetData(CUSTOMERS_SHEET)

  const customersMap = new Map(customers.map(c => [c.id, c]))
  const orderCountByCustomer = new Map<string, number>()
  for (const o of orders) {
    if (o.customer_id) {
      orderCountByCustomer.set(o.customer_id, (orderCountByCustomer.get(o.customer_id) || 0) + 1)
    }
  }

  return orders
    .filter(o => o.order_date === date)
    .map(toOrder)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(order => {
      const cust = customersMap.get(order.customer_id)
      const storedCount = cust ? parseInt(cust.order_count || '0', 10) : 0
      const actualCount = orderCountByCustomer.get(order.customer_id) || storedCount || 1
      return {
        ...order,
        customer: cust
          ? {
              id: cust.id,
              phone_normalized: cust.phone_normalized,
              name: cust.name,
              first_order_date: cust.first_order_date,
              created_at: cust.created_at,
              branch: cust.branch,
              order_count: actualCount,
            }
          : undefined,
      }
    })
}
