import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '@/lib/apiAuth';
import { getSupabase } from '@/lib/supabase';
import { emitReversalEvent } from '@mochikin/shared/events';

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

    if (action !== 'zero_point') {
      return NextResponse.json(
        { success: false, error: 'Koreksi poin dicatat sebagai reversal dan tidak dapat dibatalkan.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: ledgerEvent, error: logErr } = await supabase
      .from('point_ledger')
      .select('id, person_id, source_app, task_code, points, meta')
      .eq('id', log_id)
      .maybeSingle();

    if (logErr) throw logErr;
    if (!ledgerEvent || ledgerEvent.source_app !== 'mycustomer' || ledgerEvent.task_code !== 'MYCUST_WA') {
      return NextResponse.json(
        { success: false, error: 'Aktivitas poin MyCustomer tidak ditemukan' },
        { status: 404 }
      );
    }

    if (ledgerEvent.meta && typeof ledgerEvent.meta === 'object' && 'reversal_of' in ledgerEvent.meta) {
      return NextResponse.json(
        { success: false, error: 'Entri reversal tidak dapat diaudit ulang' },
        { status: 400 }
      );
    }
    if (ledgerEvent.person_id === auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Admin tidak dapat mengoreksi poin miliknya sendiri' },
        { status: 403 }
      );
    }

    const result = await emitReversalEvent(
      ledgerEvent.id,
      typeof note === 'string' && note.trim() ? note.trim() : 'Dinulkan oleh admin',
      { actorId: auth.user.id }
    );
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal mencatat reversal' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: result.idempotent ? 'Reversal sudah pernah dicatat' : 'Reversal poin berhasil dicatat',
      new_points: 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server saat memproses audit';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
