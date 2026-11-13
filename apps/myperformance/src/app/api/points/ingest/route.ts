import { NextResponse } from 'next/server';
import { SessionEventSchema, getAppEventsSecret } from '@mochikin/shared/events';
import { verifyRawPayload } from '@mochikin/shared/sso';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedis, pointsKey } from '@/lib/redis';
import { getAppTimezone } from '@/lib/time';

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_SERVER_ERROR';

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * POST /api/points/ingest
 *
 * Centralized batch ingestion for point platform sessions (Header + Lines).
 * Atomic transaction: all items succeed or none are inserted.
 * Server calculates and verifies all points using dim_item and point_config.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('X-Event-Signature');
  if (!signature) {
    return errorResponse('UNAUTHORIZED', 'Header X-Event-Signature wajib diisi', 401);
  }

  const rawBody = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse('BAD_REQUEST', 'Body bukan JSON valid', 400);
  }

  const parsed = SessionEventSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'BAD_REQUEST',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      400
    );
  }

  const event = parsed.data;
  const expectedSecret = getAppEventsSecret(event.appId);
  if (!verifyRawPayload(rawBody, signature, expectedSecret)) {
    return errorResponse('UNAUTHORIZED', `Signature HMAC tidak valid untuk app '${event.appId}'`, 401);
  }

  const supabase = getSupabaseAdmin() as any;

  try {
    // 1. Pengecekan Idempotensi O(1) di idempotency_registry (non-partitioned)
    const { data: existingReg } = await supabase
      .from('idempotency_registry')
      .select('event_id, response_payload')
      .eq('idempotency_key', event.idempotencyKey)
      .maybeSingle();

    if (existingReg) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...existingReg.response_payload,
            eventId: existingReg.event_id,
            idempotent: true,
          },
        },
        { status: 200 }
      );
    }

    // 2. Validasi Master Data: Person aktif & Branch valid
    const { data: person, error: personErr } = await supabase
      .from('people')
      .select('id, branch_id, status')
      .eq('id', event.personId)
      .maybeSingle();

    if (personErr || !person) {
      return errorResponse('UNPROCESSABLE_ENTITY', `Person '${event.personId}' tidak ditemukan`, 422);
    }
    if (person.status !== 'active') {
      return errorResponse('UNPROCESSABLE_ENTITY', `Person '${event.personId}' tidak aktif`, 422);
    }
    if (person.branch_id && person.branch_id !== event.branchId) {
      return errorResponse('UNPROCESSABLE_ENTITY', `Branch '${event.branchId}' tidak cocok dengan person`, 422);
    }

    // 3. Validasi Task
    const { data: task, error: taskErr } = await supabase
      .from('task_definitions')
      .select('task_code, points_per_unit, is_active')
      .eq('task_code', event.taskCode)
      .maybeSingle();

    if (taskErr || !task || !task.is_active) {
      return errorResponse('UNPROCESSABLE_ENTITY', `Task '${event.taskCode}' tidak ditemukan atau tidak aktif`, 422);
    }

    // 4. Kalkulasi Poin di Sisi Server (Server-Side Calculation)
    let calculatedTotalPoints = 0;
    let isCapped = false;
    const resolvedLines: Array<{
      itemId: number;
      qty: number;
      weightSnapshot: number;
      points: number;
      lineRef?: string;
    }> = [];

    // Ambil point_config
    const { data: configs } = await supabase.from('point_config').select('config_key, config_value');
    const configMap = new Map<string, number>();
    for (const c of configs || []) {
      configMap.set(c.config_key, Number(c.config_value));
    }

    if (event.lines && event.lines.length > 0) {
      // Skenario ber-item (misal: Stokis SO)
      const itemCodes = Array.from(new Set(event.lines.map((l) => l.itemCode)));
      const { data: dimItems, error: itemsErr } = await supabase
        .from('dim_item')
        .select('item_id, item_code, default_weight, is_active')
        .eq('app_id', event.appId)
        .in('item_code', itemCodes);

      if (itemsErr) throw itemsErr;

      const itemMap = new Map<string, { itemId: number; weight: number; isActive: boolean }>();
      for (const it of dimItems || []) {
        itemMap.set(it.item_code, { itemId: it.item_id, weight: Number(it.default_weight), isActive: it.is_active });
      }

      // Validasi atomik: Semua item_code harus terdaftar dan aktif
      for (const line of event.lines) {
        const it = itemMap.get(line.itemCode);
        if (!it) {
          return errorResponse('UNPROCESSABLE_ENTITY', `Item '${line.itemCode}' tidak terdaftar di katalog dim_item`, 422);
        }
        if (!it.isActive) {
          return errorResponse('UNPROCESSABLE_ENTITY', `Item '${line.itemCode}' saat ini tidak aktif`, 422);
        }

        const linePoints = Number((line.qty * it.weight).toFixed(2));
        calculatedTotalPoints += linePoints;
        resolvedLines.push({
          itemId: it.itemId,
          qty: line.qty,
          weightSnapshot: it.weight,
          points: linePoints,
          lineRef: line.lineRef,
        });
      }

      calculatedTotalPoints = Number(calculatedTotalPoints.toFixed(2));

      // Cek plafon sesi SO (default 8.00 pt)
      const maxSessionSo = configMap.get('stokis_max_session_points') ?? 8.0;
      if (calculatedTotalPoints > maxSessionSo) {
        calculatedTotalPoints = maxSessionSo;
        isCapped = true;
      }
    } else {
      // Skenario tanpa lines (MyCheck shift close, MyCustomer WA, insiden)
      if (event.taskCode === 'MYCHECK_SHIFT_CLOSE') {
        const baseWeight = configMap.get('mycheck_shift_base_points') ?? Number(task.points_per_unit ?? 2.0);
        const ratio = typeof event.meta?.ratio === 'number' ? Math.max(0, Math.min(1, event.meta.ratio)) : 1.0;
        calculatedTotalPoints = Number((baseWeight * ratio).toFixed(2));
      } else if (event.taskCode === 'MYCUST_WA') {
        calculatedTotalPoints = 1.00;
        const dailyLimit = configMap.get('mycustomer_wa_daily_limit') ?? 15.0;
        // Cek jumlah WA staf hari ini
        const { count } = await supabase
          .from('point_event')
          .select('*', { count: 'exact', head: true })
          .eq('person_id', event.personId)
          .eq('task_code', 'MYCUST_WA')
          .eq('shift_date', event.shiftDate);
        if ((count ?? 0) >= dailyLimit) {
          calculatedTotalPoints = 0;
          isCapped = true;
        }
      } else if (event.taskCode === 'MYCHECK_INCIDENT') {
        const rewardPoints = configMap.get('incident_reward_points') ?? 1.5;
        const maxDaily = configMap.get('incident_max_daily_reward') ?? 3.0;
        const { count } = await supabase
          .from('point_event')
          .select('*', { count: 'exact', head: true })
          .eq('person_id', event.personId)
          .eq('task_code', 'MYCHECK_INCIDENT')
          .eq('shift_date', event.shiftDate);
        if ((count ?? 0) * rewardPoints >= maxDaily) {
          calculatedTotalPoints = 0;
          isCapped = true;
        } else {
          calculatedTotalPoints = rewardPoints;
        }
      } else {
        calculatedTotalPoints = Number(task.points_per_unit ?? 1.0);
      }
    }

    // 5. Simpan Transaksi Atomik: point_event (Header) -> point_event_line -> idempotency_registry
    const { data: header, error: headerErr } = await supabase
      .from('point_event')
      .insert({
        app_id: event.appId,
        task_code: event.taskCode,
        person_id: event.personId,
        branch_id: event.branchId,
        shift_date: event.shiftDate,
        occurred_at: event.occurredAt,
        points: calculatedTotalPoints,
        kind: 'earn',
        session_ref: event.sessionRef,
        idempotency_key: event.idempotencyKey,
        meta: {
          ...event.meta,
          lines_count: resolvedLines.length,
          is_capped: isCapped,
        },
      })
      .select('event_id, shift_date')
      .single();

    if (headerErr || !header) {
      throw new Error(`Gagal menyimpan point_event: ${headerErr?.message}`);
    }

    const eventId = header.event_id;

    if (resolvedLines.length > 0) {
      const lineRows = resolvedLines.map((l) => ({
        event_id: eventId,
        shift_date: event.shiftDate,
        item_id: l.itemId,
        qty: l.qty,
        weight_snapshot: l.weightSnapshot,
        points: l.points,
        kind: 'earn',
        line_ref: l.lineRef,
      }));

      const { error: linesErr } = await supabase.from('point_event_line').insert(lineRows);
      if (linesErr) {
        throw new Error(`Gagal menyimpan point_event_line: ${linesErr.message}`);
      }
    }

    const responsePayload = {
      eventId,
      points: calculatedTotalPoints,
      linesCount: resolvedLines.length,
      isCapped,
      shiftDate: event.shiftDate,
    };

    // 6. Simpan Idempotency Registry
    await supabase.from('idempotency_registry').insert({
      idempotency_key: event.idempotencyKey,
      event_id: eventId,
      app_id: event.appId,
      response_payload: responsePayload,
    });

    // 7. Mirror Real-Time T+0 ke Redis jika hari ini
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: getAppTimezone() }).format(new Date());
    if (event.shiftDate === today) {
      try {
        const redis = getRedis();
        if (redis && calculatedTotalPoints > 0) {
          const key = pointsKey(event.personId, event.shiftDate);
          await redis.incrbyfloat(key, calculatedTotalPoints);
        }
      } catch (redisErr) {
        console.warn('⚠️ Redis T+0 mirror failed:', redisErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...responsePayload,
          idempotent: false,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      err instanceof Error ? err.message : 'Terjadi kesalahan sistem internal',
      500
    );
  }
}
