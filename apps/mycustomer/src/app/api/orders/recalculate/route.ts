import { NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'
import { invalidateSheetCache } from '@/lib/sheetCache'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

export async function POST() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    // 1. Baca semua orders
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })
    const allOrderValues = ordersResponse.data.values || []
    const ordersHeaders = allOrderValues[0] || []
    const customerIdCol = ordersHeaders.indexOf('customer_id')
    const orderRows = allOrderValues.slice(1) // skip header

    // 2. Hitung order_count per customer_id
    const countMap: Record<string, number> = {}
    if (customerIdCol >= 0) {
      for (const row of orderRows) {
        const cid = row[customerIdCol]
        if (cid) {
          countMap[cid] = (countMap[cid] || 0) + 1
        }
      }
    }

    // 3. Baca customers
    const customersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })
    const customerRows = customersResponse.data.values || []
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'No customers found' }, { status: 500 })
    }

    const headers = customerRows[0]
    const idCol = headers.indexOf('id')
    const orderCountCol = headers.indexOf('order_count')

    if (orderCountCol < 0) {
      return NextResponse.json({ error: 'order_count column not found in sheet' }, { status: 500 })
    }

    // 4. Update setiap baris customer (1x batchUpdate agar tidak terkena rate limit)
    const colLetter = String.fromCharCode(65 + orderCountCol)
    const batchData: Array<{ range: string; values: string[][] }> = []
    let updated = 0
    for (let i = 1; i < customerRows.length; i++) {
      const cid = customerRows[i][idCol]
      const newCount = countMap[cid] || 0
      const currentCount = parseInt(customerRows[i][orderCountCol] || '0', 10)
      if (currentCount !== newCount) {
        batchData.push({
          range: `${CUSTOMERS_SHEET}!${colLetter}${i + 1}`,
          values: [[String(newCount)]],
        })
        updated++
      }
    }

    if (batchData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: batchData,
        },
      })
    }

    // order_count customers berubah → invalidate
    if (updated > 0) {
      await invalidateSheetCache(['customers'])
    }

    return NextResponse.json({
      success: true,
      total_customers: customerRows.length - 1,
      total_orders: orderRows.length,
      updated,
    })
  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json(
      { error: 'Recalculate failed' },
      { status: 500 },
    )
  }
}
