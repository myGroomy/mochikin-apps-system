import { NextResponse } from 'next/server';
import { withAuth, requireRole } from '@/lib/api-auth';
import { resolveCabang } from '@/lib/google/registry';
import {
  asNum,
  asStr,
  findRowFresh,
  getPeriodSheet,
  updateRow,
  filterRows,
} from '@/lib/store';
import { createClient } from '@supabase/supabase-js';
import { canAuditReport, isReportFinal } from '@mochikin/shared/points';
import { deterministicId } from '@/lib/ids';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const pathParts = new URL(req.url).pathname.split('/');
  // /api/admin/reports/[id]/audit
  const reportId = pathParts[pathParts.length - 2];

  let body: {
    action: 'zero_point' | 'undo_zero_point' | 'approve' | 'reject';
    pointRef?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON valid' }, { status: 400 });
  }

  const { action, pointRef, note } = body;
  if (!action) {
    return NextResponse.json({ error: 'action wajib diisi' }, { status: 400 });
  }

  try {
    // 1. Cari report di Reports sheet
    const supabase = getSupabase();
    const branchId = ctx.branchIds[0] || '';
    const { spreadsheetId } = await resolveCabang(branchId);

    const hit = await findRowFresh(spreadsheetId, 'Reports', 'id', reportId);
    if (!hit) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
    }
    const reportRow = hit.data;

    const currentStatus = asStr(reportRow['status']) || 'submitted';
    if (isReportFinal(currentStatus as any)) {
      return NextResponse.json(
        { error: `Laporan sudah dalam status final (${currentStatus}), tidak dapat diaudit.` },
        { status: 400 }
      );
    }

    // 2. Handle Actions
    if (action === 'zero_point' || action === 'undo_zero_point') {
      if (!pointRef) {
        return NextResponse.json({ error: 'pointRef wajib untuk zero/undo action' }, { status: 400 });
      }

      const shiftInstanceId = asStr(reportRow['shift_instance_id']);
      const entryId = deterministicId('ENT', shiftInstanceId, pointRef);
      const tabMonth = asStr(reportRow['generated_at']).slice(0, 7) || new Date().toISOString().slice(0, 7);

      // Catat di audit trail Supabase jika tersedia
      if (supabase) {
        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: ctx.user.id || '00000000-0000-0000-0000-000000000001',
          action,
          note: note || (action === 'zero_point' ? 'Poin dinolkan' : 'Pembatalan nol poin'),
          points_before: action === 'zero_point' ? 1 : 0,
          points_after: action === 'zero_point' ? 0 : 1,
        });
      }

      return NextResponse.json({
        success: true,
        message: action === 'zero_point' ? 'Poin item dinolkan' : 'Poin item dikembalikan',
        pointRef,
        action,
      });
    }

    if (action === 'approve') {
      // Update status laporan menjadi approved
      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        status: 'approved',
        is_locked: 'TRUE',
      });

      if (supabase) {
        await supabase.from('reports').upsert({
          id: reportId,
          app_id: 'mycheck',
          branch_id: branchId || '00000000-0000-0000-0000-000000000001',
          period_label: asStr(reportRow['report_number']) || `Laporan ${reportId}`,
          period_start: asStr(reportRow['generated_at']) || new Date().toISOString(),
          period_end: new Date().toISOString(),
          status: 'approved',
          created_by: ctx.user.id || '00000000-0000-0000-0000-000000000001',
        });

        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: ctx.user.id || '00000000-0000-0000-0000-000000000001',
          action: 'approve',
          note: note || 'Disetujui oleh admin',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan berhasil di-approve final. Poin terkunci permanen.',
        status: 'approved',
      });
    }

    if (action === 'reject') {
      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        status: 'revision',
        is_locked: 'FALSE',
      });

      if (supabase) {
        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: ctx.user.id || '00000000-0000-0000-0000-000000000001',
          action: 'reject',
          note: note || 'Minta revisi dari admin',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan dikembalikan ke petugas untuk revisi.',
        status: 'revision',
      });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server audit';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
