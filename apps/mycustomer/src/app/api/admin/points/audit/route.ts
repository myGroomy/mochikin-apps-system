import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from '@/lib/apiAuth';
import { applyZeroPoint, applyUndoZeroPoint } from '@mochikin/shared';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { action, log_id, note } = body;

    if (!log_id || !action) {
      return NextResponse.json(
        { success: false, error: 'log_id dan action wajib diisi' },
        { status: 400 }
      );
    }

    if (!['zero_point', 'undo_zero_point'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action tidak valid' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Koneksi database tidak tersedia' },
        { status: 500 }
      );
    }

    const auditorId = auth.user.id || auth.user.username;

    // 1. Ambil data point_log
    const { data: rawLog, error: logErr } = await supabase
      .from('point_logs')
      .select('id, app_id, user_id, branch_id, report_id, activity_type, points_earned, points_original, created_at, metadata')
      .eq('id', log_id)
      .single();

    if (logErr || !rawLog) {
      return NextResponse.json(
        { success: false, error: 'Log poin tidak ditemukan' },
        { status: 404 }
      );
    }

    const logRecord = {
      id: rawLog.id,
      app_id: rawLog.app_id || 'mycustomer',
      user_id: rawLog.user_id,
      branch_id: rawLog.branch_id,
      report_id: rawLog.report_id || undefined,
      activity_type: rawLog.activity_type,
      points_earned: Number(rawLog.points_earned),
      points_original: Number(rawLog.points_original ?? rawLog.points_earned),
      created_at: rawLog.created_at,
      metadata: rawLog.metadata || {},
    };

    // 2. Eksekusi action
    if (action === 'zero_point') {
      const result = applyZeroPoint(
        logRecord,
        auditorId,
        note || 'Dinulkan oleh admin'
      );

      // Update point_logs
      await supabase
        .from('point_logs')
        .update({
          points_earned: result.updatedLog.points_earned,
          metadata: {
            ...logRecord.metadata,
            is_zeroed: true,
            zeroed_by: auditorId,
            zeroed_at: new Date().toISOString(),
            note,
          },
        })
        .eq('id', rawLog.id);

      // Insert audit record
      await supabase.from('point_audits').insert({
        log_id: rawLog.id,
        report_id: rawLog.report_id || null,
        auditor_id: auditorId,
        action: result.auditEntry.action,
        previous_points: result.auditEntry.points_before,
        new_points: result.auditEntry.points_after,
        note: result.auditEntry.note,
      });

      return NextResponse.json({
        success: true,
        message: 'Poin berhasil dinolkan',
        new_points: 0,
      });
    }

    if (action === 'undo_zero_point') {
      const result = applyUndoZeroPoint(
        logRecord,
        auditorId,
        note || 'Dipulihkan oleh admin'
      );

      // Update point_logs
      await supabase
        .from('point_logs')
        .update({
          points_earned: result.updatedLog.points_earned,
          metadata: {
            ...logRecord.metadata,
            is_zeroed: false,
            restored_by: auditorId,
            restored_at: new Date().toISOString(),
            note,
          },
        })
        .eq('id', rawLog.id);

      // Insert audit record
      await supabase.from('point_audits').insert({
        log_id: rawLog.id,
        report_id: rawLog.report_id || null,
        auditor_id: auditorId,
        action: result.auditEntry.action,
        previous_points: result.auditEntry.points_before,
        new_points: result.auditEntry.points_after,
        note: result.auditEntry.note,
      });

      return NextResponse.json({
        success: true,
        message: 'Poin berhasil dipulihkan',
        new_points: result.updatedLog.points_earned,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server saat memproses audit';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
