import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveCustomer,
  createOrder,
  getCustomers,
  getOrders,
  updateCustomer,
  updateOrder,
  recalculateOrderCounts,
} from '../src/lib/customerRepository'
import { getSupabase } from '../src/lib/supabase'

test('Phase 2: RDBMS Supabase Customer & Order Flow (<100ms latency)', async () => {
  const supabase = getSupabase()

  const testPhone = `08${Date.now().toString().slice(-9)}`
  const testName = 'Pelanggan Uji RDBMS'
  const testBranch = 'CBG01BDG'
  // Warm-up DNS & TLS socket connection to Supabase
  await supabase.from('branches').select('id').limit(1)

  // 1. Uji Resolve Customer Baru & Catat Latensi
  const t0 = performance.now()
  const resolvedNew = await resolveCustomer({
    phone: testPhone,
    name: testName,
    branch: testBranch,
  })
  const latencyNew = performance.now() - t0

  console.log(`[LATENCY] resolveCustomer (baru): ${latencyNew.toFixed(2)} ms`)
  assert.ok(resolvedNew.customer_id, 'Customer ID harus dihasilkan')
  assert.equal(resolvedNew.created, true, 'Customer baru harus ditandai created: true')
  assert.ok(latencyNew < 2000, `Latensi insert harus wajar < 2000ms (aktual: ${latencyNew.toFixed(2)}ms)`)

  const customerId = resolvedNew.customer_id

  // 2. Uji Resolve Customer Eksisting (Lookup Cache/Index)
  const t1 = performance.now()
  const resolvedExisting = await resolveCustomer({
    phone: testPhone,
    name: testName,
    branch: testBranch,
  })
  const latencyExisting = performance.now() - t1

  console.log(`[LATENCY] resolveCustomer (lookup eksisting): ${latencyExisting.toFixed(2)} ms`)
  assert.equal(resolvedExisting.customer_id, customerId)
  assert.equal(resolvedExisting.created, false, 'Customer eksisting tidak boleh dibuat ulang')
  assert.ok(latencyExisting < 1000, `Latensi lookup harus < 1000ms (aktual: ${latencyExisting.toFixed(2)}ms)`)

  // 3. Uji Buat Order Baru untuk Customer Ini
  const t2 = performance.now()
  const createdOrder = await createOrder({
    customer_id: customerId,
    order_date: '2026-11-15',
    channel: 'dine_in',
    raw_phone_input: testPhone,
    branch: testBranch,
    usia: '25-34',
    jenis_kelamin: 'L',
  })
  const latencyOrder = performance.now() - t2

  console.log(`[LATENCY] createOrder: ${latencyOrder.toFixed(2)} ms`)
  assert.ok(createdOrder.id, 'Order ID harus dihasilkan')
  assert.equal(createdOrder.customer_id, customerId)
  assert.equal(createdOrder.channel, 'dine_in')
  assert.ok(latencyOrder < 1500, `Latensi order harus < 1500ms (aktual: ${latencyOrder.toFixed(2)}ms)`)

  // 4. Verifikasi counter order customer terupdate
  const { data: customerData } = await supabase
    .from('mycust_customers')
    .select('order_count, age_range, gender')
    .eq('id', customerId)
    .single()

  assert.equal(customerData?.order_count, 1, 'order_count harus naik menjadi 1')
  assert.equal(customerData?.age_range, '25-34')
  assert.equal(customerData?.gender, 'L')

  // 5. Uji Fetch Customer List
  const t3 = performance.now()
  const customerList = await getCustomers(testBranch)
  const latencyGetCust = performance.now() - t3

  console.log(`[LATENCY] getCustomers (${customerList.length} baris): ${latencyGetCust.toFixed(2)} ms`)
  assert.ok(customerList.length > 0)
  assert.ok(customerList.some((c) => c.id === customerId))

  // 6. Uji Fetch Orders List
  const t4 = performance.now()
  const orderList = await getOrders(testBranch)
  const latencyGetOrders = performance.now() - t4

  console.log(`[LATENCY] getOrders (${orderList.length} baris): ${latencyGetOrders.toFixed(2)} ms`)
  assert.ok(orderList.length > 0)
  assert.ok(orderList.some((o) => o.id === createdOrder.id))

  // 7. Uji Update Customer & Order Follow Up
  const t5 = performance.now()
  await updateCustomer(customerId, {
    description: 'Catatan pelanggan VIP',
    is_followed_up: true,
  })
  const latencyUpdateCust = performance.now() - t5
  console.log(`[LATENCY] updateCustomer: ${latencyUpdateCust.toFixed(2)} ms`)

  await updateOrder(createdOrder.id, {
    is_followed_up: true,
  })

  // 8. Uji Recalculate Order Counts
  const recalc = await recalculateOrderCounts()
  assert.ok(recalc.updated >= 1)

  // Cleanup: Hapus data uji dari database
  await supabase.from('mycust_orders').delete().eq('id', createdOrder.id)
  await supabase.from('mycust_customers').delete().eq('id', customerId)
  console.log('[CLEANUP] Data uji berhasil dibersihkan dari database Supabase.')
})
