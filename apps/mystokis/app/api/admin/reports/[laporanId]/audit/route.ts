import { NextRequest, NextResponse } from 'next/server';
import { emitPlatformReversal } from '@mochikin/shared/events';
import { canAuditReport } from '@mochikin/shared';
import { assertCabangAccess, withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export const POST = withAuth(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ laporanId: string }> },
    session
  ) => {
    try {
      const { laporanId } = await params;
      const body = await req.json();
      const action = typeof body?.action === 'string' ? body.action : '';
      const note = typeof body?.note === 'string' ? body.note.trim() : '';
      const lineId = typeof body?.log_id === 'string' ? body.log_id : '';
      if (!['approve', 'reject', 'zero_point'].includes(action)) {
        return jsonError('Action tidak dikenal; audit poin hanya dapat menambah reversal, bukan mengubah transaksi lama', 400);
      }

      const supabase = getSupabase();
      let reportQuery = supabase.from('app_reports').select('*').eq('app_id', 'stokis');
      reportQuery = isUuid(laporanId)
        ? reportQuery.eq('id', laporanId)
        : reportQuery.eq('source_ref', laporanId);
      const { data: report, error: reportError } = await reportQuery.maybeSingle();
      if (reportError) throw reportError;
      if (!report) return jsonError('Laporan SO tidak ditemukan', 404);
      if (!canAuditReport(report.status)) {
        return jsonError('Laporan tidak berada dalam status yang dapat diaudit', 409);
      }

      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('code')
        .eq('id', report.branch_id)
        .single();
      if (branchError) throw branchError;
      const accessError = assertCabangAccess(session, branch.code);
      if (accessError) return accessError;

      const { data: actor, error: actorError } = await supabase
        .from('people')
        .select('id, role, name')
        .eq('username', session.username)
        .eq('status', 'active')
        .maybeSingle();
      if (actorError) throw actorError;
      if (!actor || !['branch_manager', 'role_admin', 'super_admin'].includes(actor.role)) {
        return jsonError('Akun tidak memiliki peran audit aktif di Supabase', 403);
      }

      if (action === 'zero_point') {
        if (!lineId || !/^\d+$/.test(lineId)) {
          return jsonError('log_id valid wajib diisi untuk audit poin', 400);
        }
        if (note.length < 3) return jsonError('Catatan audit minimal 3 karakter', 400);

        const { data: line, error: lineError } = await supabase
          .from('point_event_line')
          .select('line_id, event_id, item_id, shift_date, points, kind')
          .eq('line_id', lineId)
          .eq('kind', 'earn')
          .maybeSingle();
        if (lineError) throw lineError;
        if (!line) return jsonError('Baris poin tidak ditemukan', 404);

        const { data: event, error: eventError } = await supabase
          .from('point_event')
          .select('event_id, person_id, branch_id, session_ref, kind')
          .eq('event_id', line.event_id)
          .eq('app_id', 'stokis')
          .eq('session_ref', report.source_ref)
          .eq('kind', 'earn')
          .maybeSingle();
        if (eventError) throw eventError;
        if (!event || event.branch_id !== report.branch_id) {
          return jsonError('Baris poin bukan bagian dari laporan ini', 404);
        }

        const { data: existingReversal, error: reversalError } = await supabase
          .from('point_event_line')
          .select('line_id')
          .eq('reverses_line_id', line.line_id)
          .maybeSingle();
        if (reversalError) throw reversalError;
        if (existingReversal) return jsonError('Poin baris ini sudah dibatalkan', 409);

        const { data: item, error: itemError } = await supabase
          .from('dim_item')
          .select('item_code')
          .eq('item_id', line.item_id)
          .single();
        if (itemError) throw itemError;

        const reversal = await emitPlatformReversal({
          targetEventId: event.event_id,
          actorId: actor.id,
          reason: note,
          appId: 'stokis',
          itemCode: item.item_code,
          shiftDate: line.shift_date,
        });
        if (!reversal.success) {
          return jsonError(`Gagal mencatat reversal poin: ${reversal.error || 'MyPerformance event reversal gagal'}`, 502);
        }

        const { error: auditError } = await supabase.from('app_report_audit_log').insert({
          report_id: report.id,
          actor_id: actor.id,
          actor_label: actor.name,
          action: 'zero_point',
          details: {
            note,
            target_line_id: String(line.line_id),
            target_event_id: event.event_id,
            reversal_event_id: reversal.reversalEventId,
            points_before: Number(line.points),
            points_after: 0,
          },
        });
        if (auditError) throw auditError;
      } else {
        const status = action === 'approve' ? 'approved' : 'rejected';
        const { error: updateError } = await supabase
          .from('app_reports')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', report.id);
        if (updateError) throw updateError;

        const { error: auditError } = await supabase.from('app_report_audit_log').insert({
          report_id: report.id,
          actor_id: actor.id,
          actor_label: actor.name,
          action,
          details: { note },
        });
        if (auditError) throw auditError;

        return NextResponse.json({
          success: true,
          action,
          status,
          message: action === 'approve' ? 'Laporan SO berhasil disetujui secara final' : 'Laporan SO ditolak / diminta perbaikan',
        });
      }

      const { data: events, error: eventsError } = await supabase
        .from('point_event')
        .select('points')
        .eq('app_id', 'stokis')
        .eq('session_ref', report.source_ref);
      if (eventsError) throw eventsError;
      const newTotal = (events || []).reduce((total, event) => total + Number(event.points), 0);
      const { error: totalError } = await supabase
        .from('app_reports')
        .update({ total_points: newTotal, updated_at: new Date().toISOString() })
        .eq('id', report.id);
      if (totalError) throw totalError;

      return NextResponse.json({
        success: true,
        action,
        log_id: lineId,
        newTotalPoints: newTotal,
        message: 'Poin item dibatalkan melalui transaksi reversal yang immutable',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kesalahan server';
      return jsonError(message, 500);
    }
  },
  { requiredRole: 'admin' }
);
