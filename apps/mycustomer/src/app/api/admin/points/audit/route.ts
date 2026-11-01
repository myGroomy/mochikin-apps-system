import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyZeroPoint, applyUndoZeroPoint } from '@mochikin/shared';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, log_id, note, auditor_id } = body;

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

    // 1. Ambil data point_log
    const { data: log, error: logErr } = await supabase
      .from('point_logs')
      .select('id, points_earned, points_original, user_id, report_id')
      .eq('id', log_id)
      .single();

    if (logErr || !log) {
      return NextResponse.json(
        { success: false, error: 'Log poin tidak ditemukan' },
        { status: 404 }
      );
    }

    const currentPoints = Number(log.points_earned);
    const originalPoints = Number(log.points_original);
    const auditorId = auditor_id || '00000000-0000-0000-0000-000000000001';

    const pointLogObj = {
      id: log.id,
      app_id: 'mycustomer' as const,
      user_id: log.user_id,
      branch_id: '00000000-0000-0000-0000-000000000001',
      activity_type: 'order_wa',
      points_earned: currentPoints,
      points_original: originalPoints,
      report_id: log.report_id || undefined,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    let newPoints = currentPoints;
    let auditActionNote = note;

    if (action === 'zero_point') {
      const result = applyZeroPoint(pointLogObj, auditorId, note);
      newPoints = result.updatedLog.points_earned;
      auditActionNote = result.auditEntry.note;
    } else if (action === 'undo_zero_point') {
      const result = applyUndoZeroPoint(pointLogObj, auditorId, note);
      newPoints = result.updatedLog.points_earned;
      auditActionNote = result.auditEntry.note;
    }

    // 2. Update point_logs
    const { error: updateErr } = await supabase
      .from('point_logs')
      .update({ points_earned: newPoints })
      .eq('id', log_id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // 3. Catat audit di report_audits
    await supabase.from('report_audits').insert({
      report_id: log.report_id || null,
      target_log_id: log_id,
      auditor_id: auditorId,
      action,
      note: auditActionNote,
      points_before: currentPoints,
      points_after: newPoints,
    });

    return NextResponse.json({
      success: true,
      log_id,
      action,
      points_before: currentPoints,
      points_after: newPoints,
      message:
        action === 'zero_point'
          ? 'Poin berhasil dinulkan (0 pt)'
          : `Poin berhasil dipulihkan (+${newPoints} pt)`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
