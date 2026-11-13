import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from '@/lib/apiAuth';
import { emitTaskEvent } from '@mochikin/shared/events';
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: true, today: getTodayJakarta(), lockedCustomerIds: [], lockedOrderIds: [] });
    }
    const today = getTodayJakarta();
    const { data, error } = await supabase
      .from('mycustomer_wa_logs')
      .select('customer_id, order_id, point_granted')
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
    const { customer_id, order_id, user_id, branch_id, is_repeat_customer } = body;

    if (!customer_id || !order_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id dan order_id wajib diisi' },
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

    const today = getTodayJakarta();
    const userId = auth.user.id || auth.user.username || user_id || '00000000-0000-0000-0000-000000000001';
    const userName = auth.user.display_name || auth.user.username || userId;
    const branchId = branch_id || auth.user.branch || '00000000-0000-0000-0000-000000000001';

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
      .from('mycustomer_point_config')
      .select('*')
      .eq('branch_id', branchId)
      .maybeSingle();

    const pointsPerWa = Number(config?.points_per_wa ?? 1.0);
    const allowRepeatCust = config?.repeat_customer_point ?? true;
    const allowRepeatWa = config?.repeat_wa_point ?? true;

    // Cek jika pengaturan cabang menonaktifkan poin untuk pelanggan lama (repeat customer)
    if (!allowRepeatCust && is_repeat_customer) {
      await supabase.from('mycustomer_wa_logs').insert({
        user_id: userId,
        customer_id,
        order_id,
        point_granted: false,
        locked_until: today,
      });

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
        await supabase.from('mycustomer_wa_logs').insert({
          user_id: userId,
          customer_id,
          order_id,
          point_granted: false,
          locked_until: today,
        });

        return NextResponse.json({
          success: true,
          point_granted: false,
          message: 'Repeat WA tidak mendapatkan poin (pengaturan cabang).',
          locked_until: today,
        });
      }
    }

    // 3. Catat WA log dengan point_granted = true
    await supabase.from('mycustomer_wa_logs').insert({
      user_id: userId,
      customer_id,
      order_id,
      point_granted: true,
      locked_until: today,
    });

    // 4. Catat transaksi poin di point_logs
    await supabase.from('point_logs').insert({
      app_id: 'mycustomer',
      user_id: userId,
      branch_id: branchId,
      activity_type: 'order_wa',
      points_earned: pointsPerWa,
      points_original: pointsPerWa,
      metadata: { customer_id, order_id, date: today, user_name: userName },
    });

    // 5. Emisi task event MYCUST_WA ke MyPerformance (idempotencyKey deterministik)
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (isUuid(userId) && isUuid(branchId)) {
      const idempotencyKey = `mycust-wa-${order_id}-${userId}-${today}`;
      try {
        const emitRes = await emitTaskEvent({
          taskId: 'MYCUST_WA',
          personId: userId,
          branchId,
          appId: 'mycustomer',
          outputQty: 1,
          occurredAt: new Date().toISOString(),
          idempotencyKey,
          meta: { customer_id, order_id, date: today },
        });
        if (!emitRes.success) {
          console.error('❌ emitTaskEvent MYCUST_WA gagal:', emitRes.error, { order_id, userId, idempotencyKey });
        }
      } catch (emitErr) {
        console.error('❌ emitTaskEvent MYCUST_WA exception:', emitErr, { order_id, userId, idempotencyKey });
      }
    } else {
      console.error('❌ emitTaskEvent MYCUST_WA dilewati: userId atau branchId bukan UUID', { userId, branchId });
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
