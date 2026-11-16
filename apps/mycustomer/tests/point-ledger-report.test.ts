import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregatePointLedgerRows } from '../src/lib/pointLedgerReport'

test('reversal rows reduce original and contributor totals without appearing as earned activities', () => {
  const result = aggregatePointLedgerRows([
    { id: 'earn-1', person_id: 'person-1', points: 5, meta: {} },
    { id: 'reverse-1', person_id: 'person-1', points: -5, meta: { reversal_of: 'earn-1' } },
    { id: 'earn-2', person_id: 'person-2', points: 2, meta: {} },
  ])

  assert.deepEqual(result.earnedRows.map((row) => row.id), ['earn-1', 'earn-2'])
  assert.equal(result.reversalPoints.get('earn-1'), -5)
  assert.equal(result.totalPoints, 2)
  assert.deepEqual(result.userPointsMap, { 'person-1': 0, 'person-2': 2 })
})
