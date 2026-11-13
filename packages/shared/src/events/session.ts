import { z } from 'zod';
import { TASK_EVENT_APP_IDS, type TaskEventAppId } from './contract';
import { signEvent } from '../sso/signing';

/**
 * Schema for an individual item line in a session (e.g. Stokis physical item count).
 * Note: Poin TIDAK dikirim dari client. Server menghitung poin dari dim_item/point_config.
 */
export const SessionLineSchema = z.object({
  itemCode: z.string().trim().min(1).max(32),
  qty: z.number().positive().max(1_000_000),
  lineRef: z.string().trim().max(64).optional(),
});

export type SessionLine = z.infer<typeof SessionLineSchema>;

/**
 * Schema for batch session ingest (Header + optional Lines).
 */
export const SessionEventSchema = z.object({
  appId: z.enum(TASK_EVENT_APP_IDS),
  taskCode: z.string().trim().min(1).max(32),
  personId: z.string().uuid('personId harus UUID'),
  branchId: z.string().uuid('branchId harus UUID'),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'shiftDate harus format YYYY-MM-DD'),
  occurredAt: z.string().datetime({ offset: true, message: 'occurredAt harus ISO-8601 dengan timezone' }),
  sessionRef: z.string().trim().min(1).max(64),
  idempotencyKey: z.string().trim().min(8).max(128),
  meta: z.record(z.unknown()).optional(),
  lines: z.array(SessionLineSchema).optional(),
});

export type SessionEvent = z.infer<typeof SessionEventSchema>;

/**
 * Schema for audit reversal request (session or item-line).
 */
export const SessionReversalSchema = z.object({
  targetEventId: z.string().trim().min(1).max(128),
  actorId: z.string().uuid('actorId harus UUID'),
  reason: z.string().trim().min(3, 'Alasan reversal minimal 3 karakter').max(500),
  appId: z.enum(TASK_EVENT_APP_IDS),
  itemCode: z.string().trim().max(32).optional(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type SessionReversal = z.infer<typeof SessionReversalSchema>;

export interface IngestSessionResult {
  success: boolean;
  status?: number;
  eventId?: string;
  idempotent?: boolean;
  points?: number;
  linesCount?: number;
  isCapped?: boolean;
  error?: string;
  code?: string;
}

export interface ReversalSessionResult {
  success: boolean;
  status?: number;
  reversalEventId?: string;
  idempotent?: boolean;
  reversedPoints?: number;
  error?: string;
  code?: string;
}

/**
 * Returns HMAC secret configured for the specific app, falling back to shared secret.
 */
export function getAppEventsSecret(appId: TaskEventAppId): string {
  if (appId === 'mycheck' && process.env.MOCHIKIN_MYCHECK_EVENTS_SECRET) {
    return process.env.MOCHIKIN_MYCHECK_EVENTS_SECRET;
  }
  if (appId === 'stokis' && process.env.MOCHIKIN_STOKIS_EVENTS_SECRET) {
    return process.env.MOCHIKIN_STOKIS_EVENTS_SECRET;
  }
  if (appId === 'mycustomer' && process.env.MOCHIKIN_MYCUSTOMER_EVENTS_SECRET) {
    return process.env.MOCHIKIN_MYCUSTOMER_EVENTS_SECRET;
  }
  return process.env.MOCHIKIN_EVENTS_SECRET || 'dev-events-secret-key-12345';
}

/**
 * Emits a session event (Header + optional Lines) to MyPerformance batch ingest endpoint.
 */
export async function emitSessionEvent(
  event: SessionEvent,
  endpoint?: string,
  secretOverride?: string
): Promise<IngestSessionResult> {
  const secret = secretOverride || getAppEventsSecret(event.appId);
  const parsed = SessionEventSchema.safeParse(event);
  if (!parsed.success) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  const baseEndpoint = endpoint || process.env.MYPERFORMANCE_URL?.replace('/api/events/emit', '') || 'http://localhost:3004';
  const targetUrl = baseEndpoint.endsWith('/api/points/ingest') ? baseEndpoint : `${baseEndpoint}/api/points/ingest`;

  const body = JSON.stringify(parsed.data);
  const signature = signEvent(parsed.data, secret);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Signature': signature,
      },
      body,
    });

    const json = (await res.json().catch(() => null)) as
      | { success: boolean; data?: any; error?: { code?: string; message?: string } }
      | null;

    if (!json) {
      return { success: false, status: res.status, error: 'Respons server bukan JSON valid' };
    }

    if (!res.ok || json.success === false) {
      return {
        success: false,
        status: res.status,
        code: json.error?.code,
        error: json.error?.message || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      status: res.status,
      eventId: json.data?.eventId,
      idempotent: json.data?.idempotent,
      points: json.data?.points,
      linesCount: json.data?.linesCount,
      isCapped: json.data?.isCapped,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err instanceof Error ? err.message : 'Gagal menghubungi server MyPerformance',
    };
  }
}

/**
 * Emits an audit reversal request (session or line-level) to MyPerformance reversal endpoint.
 */
export async function emitPlatformReversal(
  reversal: SessionReversal,
  endpoint?: string,
  secretOverride?: string
): Promise<ReversalSessionResult> {
  const secret = secretOverride || getAppEventsSecret(reversal.appId);
  const parsed = SessionReversalSchema.safeParse(reversal);
  if (!parsed.success) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  const baseEndpoint = endpoint || process.env.MYPERFORMANCE_URL?.replace('/api/events/emit', '') || 'http://localhost:3004';
  const targetUrl = baseEndpoint.endsWith('/api/points/reversal') ? baseEndpoint : `${baseEndpoint}/api/points/reversal`;

  const body = JSON.stringify(parsed.data);
  const signature = signEvent(parsed.data, secret);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Signature': signature,
      },
      body,
    });

    const json = (await res.json().catch(() => null)) as
      | { success: boolean; data?: any; error?: { code?: string; message?: string } }
      | null;

    if (!json) {
      return { success: false, status: res.status, error: 'Respons server bukan JSON valid' };
    }

    if (!res.ok || json.success === false) {
      return {
        success: false,
        status: res.status,
        code: json.error?.code,
        error: json.error?.message || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      status: res.status,
      reversalEventId: json.data?.reversalEventId,
      idempotent: json.data?.idempotent,
      reversedPoints: json.data?.reversedPoints,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err instanceof Error ? err.message : 'Gagal menghubungi server MyPerformance',
    };
  }
}
