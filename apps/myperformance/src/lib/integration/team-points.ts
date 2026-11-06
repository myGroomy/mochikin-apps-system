export interface TeamLedgerRow {
  person_id: string;
  branch_id: string;
  source_app: string;
  points: number | string | null;
  occurred_at: string;
}

export interface MyCustomerLegacyPointRow {
  user_id: string;
  branch_id: string | null;
  app_id: string | null;
  points_earned: number | string | null;
  created_at: string;
}

export interface TeamPointRow {
  user_id: string;
  branch_id: string | null;
  app_id: string;
  points_earned: number;
  created_at: string;
}

export function combineTeamPointSources(
  ledgerRows: TeamLedgerRow[],
  legacyRows: MyCustomerLegacyPointRow[]
): TeamPointRow[] {
  const ledger = ledgerRows.map((row) => ({
    user_id: row.person_id,
    branch_id: row.branch_id,
    app_id: row.source_app,
    points_earned: Number(row.points ?? 0),
    created_at: row.occurred_at,
  }));
  const myCustomerLegacy = legacyRows
    .filter((row) => row.app_id === 'mycustomer')
    .map((row) => ({
      user_id: row.user_id,
      branch_id: row.branch_id,
      app_id: 'mycustomer',
      points_earned: Number(row.points_earned ?? 0),
      created_at: row.created_at,
    }));

  return [...ledger, ...myCustomerLegacy];
}
