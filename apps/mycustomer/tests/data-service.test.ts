import test from 'node:test'
import assert from 'node:assert/strict'
import { clearDataCache, getCustomerRows } from '../src/services/dataService'

test('customer reads return Supabase errors instead of stale cached rows', async () => {
  const originalFetch = globalThis.fetch
  clearDataCache()

  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      data: [{ id: 'customer-1', name: 'Test', aliases: [{ name: 'Alias' }] }],
    }), { status: 200 })

    const rows = await getCustomerRows()
    assert.equal(rows[0].id, 'customer-1')
    assert.equal(rows[0].aliases, '[{"name":"Alias"}]')

    clearDataCache('customers')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Supabase unavailable' }), { status: 503 })
    await assert.rejects(getCustomerRows(), /Supabase unavailable/)
  } finally {
    globalThis.fetch = originalFetch
    clearDataCache()
  }
})
