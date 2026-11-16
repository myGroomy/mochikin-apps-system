import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '../../../../lib/apiAuth';
import { getSupabase } from '../../../../lib/supabase';
import { emitTaskEvent } from '@mochikin/shared/events';

function getTodayJakarta(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function GET() {
  try {
    const auth = await authenticatedUser();
    if (auth.error) return auth.error;

    const supabase = getSupabase();
    const today = getTodayJakarta();
    const { data, error } = await supabase
      .from('mycustomer_wa_logs')
      .select('customer_id, order_id, point_granted')
      .eq('user_id', auth.user.id)
      .eq('locked_until', today);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      today,
      lockedCustomerIds: data?.map((d) => String(d.customer_id)) || [],
      lockedOrderIds: data?.map((d) => String(d.order_id)) || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { customer_id, order_id, branch_id } = body;

    if (!customer_id || !order_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id dan order_id wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const today = getTodayJakarta();
    const userId = auth.user.id;
    const userName = auth.user.display_name || auth.user.username;
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, code')
      .eq('code', auth.user.branch)
      .maybeSingle();

    if (branchError || !branch) {
      return NextResponse.json({ success: false, error: 'Cabang pengguna tidak ditemukan' }, { status: 403 });
    }

    if (branch_id && branch_id !== branch.id && branch_id !== branch.code) {
      return NextResponse.json({ success: false, error: 'Akses cabang ditolak' }, { status: 403 });
    }

    const branchId = branch.id;
    const { data: customer, error: customerError } = await supabase
      .from('mycust_customers')
      .select('id, order_count')
      .eq('id', customer_id)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: 'Pelanggan tidak ditemukan' }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabase
      .from('mycust_orders')
      .select('id')
      .eq('id', order_id)
      .eq('customer_id', customer_id)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const isRepeatCustomer = Number(customer.order_count ?? 0) > 1;

    // 1. Cek apakah sudah di-WA oleh user ini hari ini (daily lock)
    const { data: existingLock } = await supabase
      .from('mycustomer_wa_logs')
      .select('id, locked_until')
      .eq('user_id', userId)
      .eq('customer_id', customer_id)
      .eq('locked_until', today)
      .maybeSingle();

    if (existingLock) {
      return NextResponse.json({
        success: true,
        point_granted: false,
        message: 'WA sudah dikirim hari ini. Terkunci hingga besok.',
        locked_until: today,
      });
    }

    // 2. Ambil config branch
    const { data: config } = await supabase
      .from('mycustomer_branch_settings')
      .select('*')
      .eq('branch_id', branchId)
      .maybeSingle();

    const pointsPerWa = Number(config?.points_per_wa ?? 1.0);
    const allowRepeatCust = config?.repeat_customer_point ?? true;
    const allowRepeatWa = config?.repeat_wa_point ?? true;

    // Cek jika pengaturan cabang menonaktifkan poin untuk pelanggan lama (repeat customer)
    if (!allowRepeatCust && isRepeatCustomer) {
      const { error } = await supabase.from('mycustomer_wa_logs').insert({
        user_id: userId,
        customer_id,
        order_id,
        point_granted: false,
        locked_until: today,
      });
      if (error) throw error;

      return NextResponse.json({
        success: true,
        point_granted: false,
        message: 'Pelanggan lama tidak mendapatkan poin (pengaturan cabang).',
        locked_until: today,
      });
    }

    // Cek repeat history jika config membatasi
    if (!allowRepeatWa) {
      const { data: pastWa } = await supabase
        .from('mycustomer_wa_logs')
        .select('id')
        .eq('customer_id', customer_id)
        .limit(1);

      if (pastWa && pastWa.length > 0) {
        // Catat lock tanpa memberi poin
        const { error } = await supabase.from('mycustomer_wa_logs').insert({
          user_id: userId,
          customer_id,
          order_id,
          point_granted: false,
          locked_until: today,
        });
        if (error) throw error;

        return NextResponse.json({
          success: true,
          point_granted: false,
          message: 'Repeat WA tidak mendapatkan poin (pengaturan cabang).',
          locked_until: today,
        });
      }
    }
    // 2B. Cek batas harian follow-up WA per staf (default 15 chat/hari)
    const { count: dailyGrantedCount } = await supabase
      .from('mycustomer_wa_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('locked_until', today)
      .eq('point_granted', true);

    const waDailyLimit = 15;
    if ((dailyGrantedCount ?? 0) >= waDailyLimit) {
      const { error } = await supabase.from('mycustomer_wa_logs').insert({
        user_id: userId,
        customer_id,
        order_id,
        point_granted: false,
        locked_until: today,
      });
      if (error) throw error;

      return NextResponse.json({
        success: true,
        point_granted: false,
        is_capped: true,
        message: `Batas harian follow-up WhatsApp (${waDailyLimit} chat/hari) telah tercapai. Pesan tetap tercatat tanpa penambahan poin.`,
        locked_until: today,
      });
    }

    const { data: waLog, error: logError } = await supabase
      .from('mycustomer_wa_logs')
      .insert({
        user_id: userId,
        customer_id,
        order_id,
        point_granted: true,
        locked_until: today,
      })
      .select('id')
      .single();
    if (logError) throw logError;

    const idempotencyKey = `mycust-wa-${order_id}-${userId}-${today}`;
    const emitRes = await emitTaskEvent({
      taskId: 'MYCUST_WA',
      personId: userId,
      branchId,
      appId: 'mycustomer',
      outputQty: 1,
      occurredAt: new Date().toISOString(),
      idempotencyKey,
      meta: { customer_id, order_id, date: today, user_name: userName },
    });
    if (!emitRes.success) {
      const { error: rollbackError } = await supabase
        .from('mycustomer_wa_logs')
        .delete()
        .eq('id', waLog.id);
      if (rollbackError) {
        throw new Error(`Pencatatan event poin gagal (${emitRes.error}) dan lock WA tidak dapat dibatalkan: ${rollbackError.message}`);
      }
      return NextResponse.json(
        { success: false, error: `Gagal mencatat poin: ${emitRes.error || 'MyPerformance tidak tersedia'}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      point_granted: true,
      points: pointsPerWa,
      locked_until: today,
      message: `+${pointsPerWa} Poin berhasil didapatkan!`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
