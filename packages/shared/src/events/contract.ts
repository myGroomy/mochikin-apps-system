import { z } from 'zod';
import { signEvent } from '../sso/signing';

/**
 * The three producer applications allowed to emit task events.
 * Keep this list in sync with `task_definitions.app_id` in migration 009.
 */
export const TASK_EVENT_APP_IDS = ['mycheck', 'stokis', 'mycustomer'] as const;
export type TaskEventAppId = (typeof TASK_EVENT_APP_IDS)[number];

/**
 * Canonical event contract between producer apps and MyPerformance.
 *
 * Notes
 * - `personId` / `branchId` are UUIDs because the master-data schema (004) uses
 *   UUID primary keys. Sending a legacy TEXT id will be rejected with 400.
 * - `occurredAt` MUST carry an explicit offset (`Z` or `+07:00`). The server
 *   converts it to the business date in `APP_TIMEZONE` (default Asia/Jakarta).
 * - `idempotencyKey` is chosen by the producer. Re-sending the same key returns
 *   the original ledger row with HTTP 200 instead of writing a second row.
 * - Unknown properties are stripped, not rejected, so producers can add
 *   forward-compatible metadata without breaking the contract.
 */
export const TaskEventSchema = z.object({
  taskId: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_]+$/, 'taskId harus UPPER_SNAKE_CASE, contoh MYCHECK_HADIR'),
  personId: z.string().uuid('personId harus UUID'),
  branchId: z.string().uuid('branchId harus UUID'),
  appId: z.enum(TASK_EVENT_APP_IDS),
  outputQty: z.number().int().positive().max(1_000_000),
  occurredAt: z
    .string()
    .datetime({ offset: true, message: 'occurredAt harus ISO-8601 dengan timezone' }),
  idempotencyKey: z.string().trim().min(8).max(128),
  /** Optional producer metadata. Never used for point calculation. */
  meta: z.record(z.unknown()).optional(),
});

export type TaskEvent = z.infer<typeof TaskEventSchema>;

export interface EmitTaskEventResult {
  success: boolean;
  status?: number;
  event_id?: string;
  idempotent?: boolean;
  points?: number;
  shift_date?: string;
  error?: string;
  code?: string;
}

/**
 * Validate task event structure without throwing.
 * Prefer `TaskEventSchema.safeParse` in new code so the caller can surface
 * field-level errors; this helper stays for backwards compatibility.
 */
export function validateTaskEvent(event: unknown): TaskEvent | null {
  const parsed = TaskEventSchema.safeParse(event);
  if (!parsed.success) {
    console.error(
      '❌ Invalid TaskEvent:',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    );
    return null;
  }
  return parsed.data;
}

/**
 * Emit a task event to the MyPerformance ingress with an HMAC signature.
 *
 * The signature is computed over `JSON.stringify(event)` and the request body
 * is the exact same string, so the server can verify the raw body without
 * worrying about key re-ordering by a JSON parser.
 */
export async function emitTaskEvent(
  event: TaskEvent,
  endpoint: string = process.env.MYPERFORMANCE_URL ||
    'http://localhost:3004/api/events/emit',
  secret: string = process.env.MOCHIKIN_EVENTS_SECRET || 'dev-events-secret-key-12345'
): Promise<EmitTaskEventResult> {
  const parsed = TaskEventSchema.safeParse(event);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
      code: 'BAD_REQUEST',
    };
  }

  const body = JSON.stringify(parsed.data);
  const signature = signEvent(parsed.data, secret);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Signature': signature,
      },
      body,
    });

    const json = (await res.json().catch(() => null)) as
      | (Partial<EmitTaskEventResult> & {
          data?: { points?: number; shift_date?: string };
          error?: { code?: string; message?: string };
        })
      | null;

    if (!json) {
      return { success: false, status: res.status, error: 'Respons bukan JSON' };
    }

    if (!res.ok || json.success === false) {
      return {
        success: false,
        status: res.status,
        error: json.error?.message || json.error?.code || `HTTP ${res.status}`,
        code: json.error?.code,
      };
    }

    return {
      success: true,
      status: res.status,
      event_id: json.event_id,
      idempotent: json.idempotent,
      points: json.data?.points,
      shift_date: json.data?.shift_date,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}
