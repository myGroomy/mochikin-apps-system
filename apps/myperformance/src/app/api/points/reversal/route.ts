import { NextResponse } from 'next/server';
import { SessionReversalSchema, getAppEventsSecret } from '@mochikin/shared/events';
import { verifyRawPayload } from '@mochikin/shared/sso';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedis, pointsKey } from '@/lib/redis';
import { getAppTimezone } from '@/lib/time';

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_SERVER_ERROR';

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * POST /api/points/reversal
 *
 * Reversal gateway for session-level and item-level point cancellation.
 * Strict append-only: inserts negative offsetting records into point_event/line.
 * Validates: 90-day correction window, anti-self-audit, bounded reversal limits.
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

  const parsed = SessionReversalSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'BAD_REQUEST',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      400
    );
  }

  const rev = parsed.data;
  const expectedSecret = getAppEventsSecret(rev.appId);
  if (!verifyRawPayload(rawBody, signature, expectedSecret)) {
    return errorResponse('UNAUTHORIZED', `Signature HMAC tidak valid untuk app '${rev.appId}'`, 401);
  }

  const supabase = getSupabaseAdmin() as any;

  try {
    const reversalIdemKey = rev.itemCode
      ? `reversal-${rev.targetEventId}-${rev.itemCode}`
      : `reversal-${rev.targetEventId}`;

    // 1. Cek Idempotensi di idempotency_registry
    const { data: existingReg } = await supabase
      .from('idempotency_registry')
      .select('event_id, response_payload')
      .eq('idempotency_key', reversalIdemKey)
      .maybeSingle();

    if (existingReg) {
      return NextResponse.json(
        {
          success: true,
          data: {
            ...existingReg.response_payload,
            reversalEventId: existingReg.event_id,
            idempotent: true,
          },
        },
        { status: 200 }
      );
    }

    // 2. Validasi Auditor (Anti-Self-Audit & Otoritas Role)
    const { data: actor, error: actorErr } = await supabase
      .from('people')
      .select('id, role, status')
      .eq('id', rev.actorId)
      .maybeSingle();

    if (actorErr || !actor || actor.status !== 'active') {
      return errorResponse('UNPROCESSABLE_ENTITY', 'Auditor tidak ditemukan atau tidak aktif', 422);
    }

    const allowedRoles = ['branch_manager', 'role_admin', 'super_admin'];
    if (!allowedRoles.includes(actor.role)) {
      return errorResponse('FORBIDDEN', 'Hanya Manajer Cabang atau Admin yang berhak melakukan audit pembatalan poin', 403);
    }

    // 3. Ambil Event Asal
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rev.targetEventId);
    let origQuery = supabase.from('point_event').select('*').eq('app_id', rev.appId);
    if (isTargetUuid) {
      origQuery = origQuery.or(`event_id.eq.${rev.targetEventId},idempotency_key.eq.${rev.targetEventId},session_ref.eq.${rev.targetEventId}`);
    } else {
      origQuery = origQuery.or(`idempotency_key.eq.${rev.targetEventId},session_ref.eq.${rev.targetEventId}`);
    }

    const { data: origEvents, error: findErr } = await origQuery;
    if (findErr) throw findErr;

    // Filter event asal berjenis 'earn'
    const origEvent = (origEvents || []).find((e: any) => e.kind === 'earn');
    if (!origEvent) {
      return errorResponse('UNPROCESSABLE_ENTITY', `Transaksi asal '${rev.targetEventId}' tidak ditemukan`, 422);
    }

    // Anti-Self-Audit Rule: Auditor tidak boleh membatalkan poin miliknya sendiri
    if (rev.actorId === origEvent.person_id) {
      return errorResponse('FORBIDDEN', 'Auditor dilarang melakukan audit pembatalan atas poin milik sendiri', 403);
    }

    // Jendela Koreksi 90 Hari
    const origDate = new Date(origEvent.shift_date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      return errorResponse('UNPROCESSABLE_ENTITY', `Jendela waktu koreksi audit 90 hari telah terlampaui (${diffDays} hari lalu)`, 422);
    }

    let reversedPoints = 0;
    const shiftDate = origEvent.shift_date;

    // 4. Proses Reversal: Item-Level vs Session-Level
    if (rev.itemCode) {
      // Reversal Item-Line
      const { data: item } = await supabase
        .from('dim_item')
        .select('item_id')
        .eq('app_id', rev.appId)
        .eq('item_code', rev.itemCode)
        .maybeSingle();

      if (!item) {
        return errorResponse('UNPROCESSABLE_ENTITY', `Item '${rev.itemCode}' tidak terdaftar di dim_item`, 422);
      }

      // Ambil line asal
      const { data: origLine } = await supabase
        .from('point_event_line')
        .select('*')
        .eq('event_id', origEvent.event_id)
        .eq('shift_date', shiftDate)
        .eq('item_id', item.item_id)
        .eq('kind', 'earn')
        .maybeSingle();

      if (!origLine) {
        return errorResponse('UNPROCESSABLE_ENTITY', `Baris item '${rev.itemCode}' tidak ditemukan pada event terkait`, 422);
      }

      // Cek apakah sudah pernah dibatalkan
      const { data: existingLineRev } = await supabase
        .from('point_event_line')
        .select('line_id')
        .eq('reverses_line_id', origLine.line_id)
        .maybeSingle();

      if (existingLineRev) {
        return errorResponse('UNPROCESSABLE_ENTITY', `Baris item '${rev.itemCode}' sudah pernah dibatalkan sebelumnya`, 422);
      }

      const linePoints = Number(origLine.points || 0);
      reversedPoints = -linePoints;

      // Sisipkan Header Reversal Negatif
      const { data: revHeader, error: headerErr } = await supabase
        .from('point_event')
        .insert({
          app_id: rev.appId,
          task_code: origEvent.task_code,
          person_id: origEvent.person_id,
          branch_id: origEvent.branch_id,
          shift_date: shiftDate,
          occurred_at: new Date().toISOString(),
          points: reversedPoints,
          kind: 'reversal',
          reverses_event_id: origEvent.event_id,
          actor_id: rev.actorId,
          reason: rev.reason,
          session_ref: origEvent.session_ref,
          idempotency_key: reversalIdemKey,
          meta: { reversed_item_code: rev.itemCode, original_line_id: origLine.line_id },
        })
        .select('event_id')
        .single();

      if (headerErr) throw headerErr;

      // Sisipkan Line Reversal Negatif
      await supabase.from('point_event_line').insert({
        event_id: revHeader.event_id,
        shift_date: shiftDate,
        item_id: item.item_id,
        qty: origLine.qty,
        weight_snapshot: origLine.weight_snapshot,
        points: reversedPoints,
        kind: 'reversal',
        reverses_line_id: origLine.line_id,
      });

      const responsePayload = {
        reversalEventId: revHeader.event_id,
        reversedPoints,
        itemCode: rev.itemCode,
        shiftDate,
      };

      await supabase.from('idempotency_registry').insert({
        idempotency_key: reversalIdemKey,
        event_id: revHeader.event_id,
        app_id: rev.appId,
        response_payload: responsePayload,
      });

      return NextResponse.json({ success: true, data: { ...responsePayload, idempotent: false } }, { status: 201 });
    } else {
      // Reversal Seluruh Sesi
      const { data: existingHeaderRev } = await supabase
        .from('point_event')
        .select('event_id')
        .eq('reverses_event_id', origEvent.event_id)
        .eq('kind', 'reversal')
        .maybeSingle();

      if (existingHeaderRev) {
        return errorResponse('UNPROCESSABLE_ENTITY', 'Sesi ini sudah pernah dibatalkan (reversed) sebelumnya', 422);
      }

      reversedPoints = -Number(origEvent.points || 0);

      const { data: revHeader, error: headerErr } = await supabase
        .from('point_event')
        .insert({
          app_id: rev.appId,
          task_code: origEvent.task_code,
          person_id: origEvent.person_id,
          branch_id: origEvent.branch_id,
          shift_date: shiftDate,
          occurred_at: new Date().toISOString(),
          points: reversedPoints,
          kind: 'reversal',
          reverses_event_id: origEvent.event_id,
          actor_id: rev.actorId,
          reason: rev.reason,
          session_ref: origEvent.session_ref,
          idempotency_key: reversalIdemKey,
          meta: { full_session_reversal: true },
        })
        .select('event_id')
        .single();

      if (headerErr) throw headerErr;

      const responsePayload = {
        reversalEventId: revHeader.event_id,
        reversedPoints,
        shiftDate,
      };

      await supabase.from('idempotency_registry').insert({
        idempotency_key: reversalIdemKey,
        event_id: revHeader.event_id,
        app_id: rev.appId,
        response_payload: responsePayload,
      });

      // Sesuaikan T+0 Redis bila hari ini
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: getAppTimezone() }).format(new Date());
      if (shiftDate === today) {
        try {
          const redis = getRedis();
          if (redis) {
            await redis.incrbyfloat(pointsKey(origEvent.person_id, shiftDate), reversedPoints);
          }
        } catch (rErr) {
          console.warn('⚠️ Redis T+0 reversal mirror warning:', rErr);
        }
      }

      return NextResponse.json({ success: true, data: { ...responsePayload, idempotent: false } }, { status: 201 });
    }
  } catch (err) {
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      err instanceof Error ? err.message : 'Terjadi kesalahan sistem internal',
      500
    );
  }
}
