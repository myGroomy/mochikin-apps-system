export interface DataRow {
  [key: string]: string
}

type DataResource = 'customers' | 'orders'

const cache = new Map<DataResource, { data: DataRow[]; fetchedAt: number }>()
const CACHE_TTL = 30_000

function toRows(data: unknown): DataRow[] {
  if (!Array.isArray(data)) throw new Error('Respons data Supabase tidak valid')
  return data.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Baris data Supabase tidak valid')
    return Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value),
      ]),
    )
  })
}

async function getRows(resource: DataResource): Promise<DataRow[]> {
  const cached = cache.get(resource)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data

  const response = await fetch(`/api/${resource}`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Gagal memuat ${resource}`)

  const rows = toRows(payload.data)
  cache.set(resource, { data: rows, fetchedAt: Date.now() })
  return rows
}

export const getCustomerRows = () => getRows('customers')
export const getOrderRows = () => getRows('orders')

export function clearDataCache(resource?: DataResource): void {
  if (resource) cache.delete(resource)
  else cache.clear()
}
