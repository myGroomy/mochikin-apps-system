export interface PointLedgerReportRow {
  id: string
  person_id: string
  points: number | string | null
  meta: Record<string, unknown> | null
}

export function aggregatePointLedgerRows<T extends PointLedgerReportRow>(rows: T[]) {
  const reversalPoints = new Map<string, number>()
  for (const row of rows) {
    const originalId = typeof row.meta?.reversal_of === 'string' ? row.meta.reversal_of : null
    if (originalId) reversalPoints.set(originalId, (reversalPoints.get(originalId) || 0) + Number(row.points || 0))
  }

  const userPointsMap: Record<string, number> = {}
  for (const row of rows) {
    userPointsMap[row.person_id] = (userPointsMap[row.person_id] || 0) + Number(row.points || 0)
  }

  return {
    earnedRows: rows.filter((row) => typeof row.meta?.reversal_of !== 'string'),
    reversalPoints,
    totalPoints: rows.reduce((total, row) => total + Number(row.points || 0), 0),
    userPointsMap,
  }
}
