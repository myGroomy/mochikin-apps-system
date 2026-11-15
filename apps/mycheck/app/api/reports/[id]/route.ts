import { NextResponse } from 'next/server';
import { withAuth, requireBranchAccess, type AuthContext } from '../../../../lib/api-auth';
import { getSupabase } from '../../../../lib/supabase';
import { resolveCabang, getCabangList } from '../../../../lib/google/registry';
import { filterRows, asStr } from '../../../../lib/store';
import { buildReportDetail } from '../../../../lib/report-detail';

/** Cari laporan (Reports) pada cabang yang diakses user. */
async function locateReport(
  ctx: AuthContext,
  reportId: string
): Promise<{ spreadsheetId: string; branchId: string } | null> {
  const cabangs = await getCabangList();
  for (const cabang of cabangs) {
    if (!ctx.branchIds.includes(cabang.Cabang_ID) || !cabang.Spreadsheet_ID) continue;
    try {
      const { spreadsheetId } = await resolveCabang(cabang.Cabang_ID);
      const hits = await filterRows(
        spreadsheetId,
        'Reports',
        (r) => asStr(r['id']) === reportId
      );
      if (hits[0]) return { spreadsheetId, branchId: cabang.Cabang_ID };
    } catch {
      // lanjut
    }
  }
  return null;
}

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const reportId = new URL(_req.url).pathname.split('/').at(-1) ?? '';

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: shift } = await supabase
        .from('mycheck_shift_instances')
        .select('*, branches(*)')
        .eq('id', reportId)
        .maybeSingle();

      if (shift) {
        const { data: entries } = await supabase
          .from('mycheck_entries')
          .select('*')
          .eq('shift_instance_id', reportId);
        const { data: handovers } = await supabase
          .from('mycheck_handovers')
          .select('*')
          .eq('shift_instance_id', reportId);
        const { data: incidents } = await supabase
          .from('mycheck_incidents')
          .select('*')
          .eq('shift_instance_id', reportId);

        return NextResponse.json({
          report: {
            id: shift.id,
            branch_id: shift.branch_id,
            shift_instance_id: shift.id,
            shift_date: shift.shift_date,
            status: shift.status,
            opened_at: shift.opened_at,
            closed_at: shift.closed_at,
            total_points: 100,
            original_points: 100,
            archive_pdf_drive_url: null,
            entries: entries || [],
            handovers: handovers || [],
            incidents: incidents || [],
          },
        });
      }
    } catch (dbErr) {
      console.warn('⚠️ Supabase report fetch fallback:', dbErr);
    }
  }

  // Fallback pengujian
  const located = await locateReport(ctx, reportId);
  if (!located) {
    return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  const branchAccessError = requireBranchAccess(ctx, located.branchId);
  if (branchAccessError) return branchAccessError;

  const detail = await buildReportDetail(
    located.spreadsheetId,
    located.branchId,
    reportId
  );
  if (!detail) {
    return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  const summaryStats = (detail.report.summary_stats as Record<string, unknown>) || {};

  const response = NextResponse.json({
    report: {
      ...detail.report,
      total_points: summaryStats.total_points ?? summaryStats.adjusted_points ?? 100,
      original_points: summaryStats.original_points ?? 100,
      archive_pdf_drive_url: null,
    },
    entries: detail.entries,
    handover: detail.handover,
    incidents: detail.incidents,
  });

  return response;
});
