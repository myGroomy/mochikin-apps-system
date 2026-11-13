import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '../../../../../../lib/supabase';
import {
  applyZeroPoint,
  applyUndoZeroPoint,
  createReportStatusAudit,
  canAuditReport,
  isReportFinal,
} from '@mochikin/shared';
import { emitReversalEvent } from '@mochikin/shared/events';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ laporanId: string }> }
) {
  try {
    const { laporanId } = await params;
    const body = await req.json();
    const { action, log_id, note, auditor_id } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Parameter action wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database tidak tersedia' },
        { status: 500 }
      );
    }

    // 1. Cari report berdasarkan laporanId (UUID) atau external_ref (sesiId)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(laporanId);
    let repQuery = supabase.from('reports').select('*').eq('app_id', 'stokis');
    if (isUuid) {
      repQuery = repQuery.or(`id.eq.${laporanId},external_ref.eq.${laporanId}`);
    } else {
      repQuery = repQuery.eq('external_ref', laporanId);
    }
    const { data: report, error: repErr } = await repQuery.maybeSingle();
    if (repErr || !report) {
      return NextResponse.json(
        { success: false, error: 'Laporan SO tidak ditemukan' },
        { status: 404 }
      );
    }

    const auditorId = auditor_id || '00000000-0000-0000-0000-000000000001';

    // 2. Action: zero_point / undo_zero_point
    if (action === 'zero_point' || action === 'undo_zero_point') {
      if (isReportFinal(report.status)) {
        return NextResponse.json(
          { success: false, error: 'Laporan sudah final dan tidak dapat diaudit lagi' },
          { status: 400 }
        );
      }

      if (!log_id) {
        return NextResponse.json(
          { success: false, error: 'log_id wajib diisi untuk zero/undo' },
          { status: 400 }
        );
      }

      const { data: log, error: logErr } = await supabase
        .from('point_logs')
        .select('*')
        .eq('id', log_id)
        .eq('report_id', report.id)
        .single();

      if (logErr || !log) {
        return NextResponse.json(
          { success: false, error: 'Log item tidak ditemukan di laporan ini' },
          { status: 404 }
        );
      }

      const pointLogObj = {
        id: log.id,
        app_id: 'stokis' as const,
        user_id: log.user_id,
        branch_id: log.branch_id,
        activity_type: log.activity_type,
        points_earned: Number(log.points_earned),
        points_original: Number(log.points_original),
        report_id: report.id,
        metadata: log.metadata || {},
        created_at: log.created_at,
      };

      let newPoints = Number(log.points_earned);
      let auditNote = note;

      if (action === 'zero_point') {
        const res = applyZeroPoint(pointLogObj, auditorId, note);
        newPoints = res.updatedLog.points_earned;
        auditNote = res.auditEntry.note;

        // F-04: Kirim event reversal negatif ke point_ledger MyPerformance
        try {
          const sourceRef = report.external_ref || (report as Record<string, unknown>)['source_report_id'] || report.id;
          const targetEventId = `stokis-so-${sourceRef}-${log.user_id}`;
          const revRes = await emitReversalEvent(targetEventId, auditNote, { supabaseClient: supabase });
          if (!revRes.success) {
            console.error('❌ emitReversalEvent gagal saat zero_point di audit stokis:', revRes.error, {
              targetEventId,
              reportId: report.id,
              userId: log.user_id,
            });
          }
        } catch (revErr) {
          console.error('❌ emitReversalEvent exception di audit stokis:', revErr, {
            reportId: report.id,
            userId: log.user_id,
          });
        }
      } else {
        const res = applyUndoZeroPoint(pointLogObj, auditorId, note);
        newPoints = res.updatedLog.points_earned;
        auditNote = res.auditEntry.note;
      }

      // Update point_logs
      await supabase
        .from('point_logs')
        .update({ points_earned: newPoints })
        .eq('id', log_id);

      // Catat di report_audits
      await supabase.from('report_audits').insert({
        report_id: report.id,
        target_log_id: log_id,
        auditor_id: auditorId,
        action,
        note: auditNote,
        points_before: Number(log.points_earned),
        points_after: newPoints,
      });

      // Recalculate total_points on report
      const { data: updatedLogs } = await supabase
        .from('point_logs')
        .select('points_earned')
        .eq('report_id', report.id);

      const newTotal = (updatedLogs || []).reduce((acc, curr) => acc + Number(curr.points_earned || 0), 0);
      await supabase.from('reports').update({ total_points: newTotal }).eq('id', report.id);

      return NextResponse.json({
        success: true,
        action,
        log_id,
        newPoints,
        newTotalPoints: newTotal,
        message:
          action === 'zero_point'
            ? 'Poin item dinolkan (0 pt)'
            : `Poin item dipulihkan (+${newPoints} pt)`,
      });
    }

    // 3. Action: approve / reject
    if (action === 'approve' || action === 'reject') {
      const targetStatus = action === 'approve' ? 'approved' : 'rejected';
      const statusAudit = createReportStatusAudit(report.id, auditorId, action, note);

      await supabase
        .from('reports')
        .update({ status: targetStatus })
        .eq('id', report.id);

      await supabase.from('report_audits').insert({
        report_id: report.id,
        auditor_id: auditorId,
        action,
        note: statusAudit.note,
        points_before: Number(report.total_points),
        points_after: Number(report.total_points),
      });

      return NextResponse.json({
        success: true,
        action,
        status: targetStatus,
        message:
          action === 'approve'
            ? 'Laporan SO berhasil disetujui secara final'
            : 'Laporan SO ditolak / diminta perbaikan',
      });
    }

    return NextResponse.json({ success: false, error: 'Action tidak dikenal' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
