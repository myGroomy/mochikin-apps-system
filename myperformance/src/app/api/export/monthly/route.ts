import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createSheetsClient } from '@mochikin/shared/sheets';

const MONTH_RE = /^\d{4}-\d{2}$/;

function isValidMonth(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const [y, m] = value.split('-').map(Number);
  return m >= 1 && m <= 12;
}

function csvCell(value: unknown): string {
  const str = String(value ?? '');
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map((c) => csvCell(c)).join(',')).join('\r\n');
}

/**
 * POST /api/export/monthly
 *
 * M3 FR-D2 + N6: monthly points export to Google Sheets (admin only).
 * Writes an audit row to events_audit on every export attempt (also when the
 * sheet destination is not configured — export attempt is still audited).
 */
export async function POST(request: Request) {
  const auth = getAuthContext(request as never);

  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak: hanya admin yang dapat melakukan ekspor Google Sheets' } },
      { status: 403 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const period: string = body?.period || url.searchParams.get('period') || new Date().toISOString().slice(0, 7);
  const monthValid = isValidMonth(period);

  if (!monthValid) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Format periode harus YYYY-MM' } },
      { status: 400 }
    );
  }

  const [year, month] = period.split('-').map(Number);
  const start = `${period}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const { data: rollups, error: rollupError } = await supabaseAdmin
    .from('point_rollups')
    .select('person_id, branch_id, total_points, event_count, period_key')
    .eq('period_type', 'month')
    .eq('period_key', period);

  if (rollupError) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: rollupError.message } }, { status: 500 });
  }

  const rows = [
    ['MyPerformance Monthly Export', `Period: ${period}`, `Exported By: ${auth.personId}`, new Date().toISOString()],
    ['Person ID', 'Branch ID', 'Total Points', 'Event Count'],
    ...(rollups || []).map((r: { person_id: string; branch_id: string; total_points: number; event_count: number }) => [
      r.person_id,
      r.branch_id,
      r.total_points,
      r.event_count,
    ]),
  ];

  let exportedToSheets = false;
  let exportedToCsv = false;
  let csv = '';
  try {
    const sheetsClient = createSheetsClient();
    await sheetsClient.appendRows('MonthlyExport!A:D', rows.slice(1));
    exportedToSheets = true;
  } catch (sheetErr) {
    // Google Sheets credentials not configured / quota exhausted → produce CSV
    // fallback and still audit. (M3 acceptance: export attempt is auditable.)
    exportedToCsv = true;
    csv = toCsv(rows);
  }

  try {
    await supabaseAdmin.from('events_audit').insert({
      table_name: 'point_rollups',
      operation: 'EXPORT',
      record_id: period,
      changed_by: auth.personId,
      old_values: null,
      new_values: { period, exported_to_sheets: exportedToSheets, exported_to_csv: exportedToCsv, record_count: (rollups || []).length },
    });
  } catch (auditErr) {
    // Non-fatal: never fail the export because the audit log is unavailable.
    console.warn('⚠️ Export audit failed:', auditErr);
  }

  return NextResponse.json({
    success: true,
    data: {
      period,
      record_count: (rollups || []).length,
      exported_to_sheets: exportedToSheets,
      exported_to_csv: exportedToCsv,
      csv,
      rows_preview: rows,
    },
  });
}
