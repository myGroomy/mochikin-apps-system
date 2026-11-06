import { NextResponse } from 'next/server';
import { TaskEventSchema } from '@mochikin/shared/events';
import { verifyRawPayload } from '@mochikin/shared/sso';
import { pointsService } from '@/lib/integration/points';

const DEV_EVENTS_SECRET = 'dev-events-secret-key-12345';

function getEventsSecret(): string | null {
  const secret = process.env.MOCHIKIN_EVENTS_SECRET;
  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret === DEV_EVENTS_SECRET) return null;
    return secret;
  }
  return process.env.NODE_ENV === 'production' ? null : DEV_EVENTS_SECRET;
}

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
 * POST /api/events/emit
 *
 * Trusted internal ingress for task events from mycheck/stokis/mycustomer.
 * Flow: raw-body HMAC → Zod → task/person validation → append ledger → Redis T+0.
 */
export async function POST(request: Request) {
  const eventsSecret = getEventsSecret();
  if (!eventsSecret) {
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'MOCHIKIN_EVENTS_SECRET harus dikonfigurasi dengan secret non-development.',
      503
    );
  }

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

  if (!verifyRawPayload(rawBody, signature, eventsSecret)) {
    return errorResponse('UNAUTHORIZED', 'Signature HMAC tidak valid', 401);
  }

  const parsed = TaskEventSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'BAD_REQUEST',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      400
    );
  }

  try {
    const result = await pointsService.recordEvent(parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          event_id: result.eventId,
          idempotency_key: parsed.data.idempotencyKey,
          points: result.points,
          shift_date: result.shiftDate,
        },
        event_id: result.eventId,
        idempotent: result.idempotent,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'validation' in err) {
      const issue = (err as { validation: { code: string; message: string } }).validation;
      return errorResponse('UNPROCESSABLE_ENTITY', issue.message, 422);
    }
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      err instanceof Error ? err.message : 'Kesalahan tidak dikenal',
      500
    );
  }
}
