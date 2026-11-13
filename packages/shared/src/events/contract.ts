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

let _cachedEventEmitUrl: { url: string; expiresAt: number } | null = null;

/**
 * Resolves the target endpoint URL for MyPerformance event emission dynamically.
 * Priority:
 * 1. process.env.MYPERFORMANCE_URL (explicit override)
 * 2. In-memory cache (TTL 60s)
 * 3. Supabase `apps` table row for 'MYPERFORMANCE' (dynamic apps management in service)
 * 4. Fallback to 'http://localhost:3004/api/events/emit'
 */
export async function resolveEventEmitUrl(): Promise<string> {
  const explicit = process.env.MYPERFORMANCE_URL?.trim();
  if (explicit) return explicit;

  const now = Date.now();
  if (_cachedEventEmitUrl && _cachedEventEmitUrl.expiresAt > now) {
    return _cachedEventEmitUrl.url;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('apps')
        .select('url, status')
        .or('name.ilike.%myperformance%,name.ilike.%performance%')
        .maybeSingle();

      if (data?.url && typeof data.url === 'string' && data.status !== 'inactive') {
        const cleanBase = data.url.trim().replace(/\/+$/, '');
        const resolved = `${cleanBase}/api/events/emit`;
        _cachedEventEmitUrl = { url: resolved, expiresAt: now + 60_000 };
        return resolved;
      }
    } catch {
      // ignore db resolution failure, proceed to fallback
    }
  }

  return 'http://localhost:3004/api/events/emit';
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
  endpoint?: string,
  secret: string = process.env.MOCHIKIN_EVENTS_SECRET || 'dev-events-secret-key-12345'
): Promise<EmitTaskEventResult> {
  const targetEndpoint = endpoint || (await resolveEventEmitUrl());
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
    const res = await fetch(targetEndpoint, {
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

export interface EmitReversalResult {
  success: boolean;
  idempotent?: boolean;
  points?: number;
  eventId?: string;
  error?: string;
}

/**
 * Emits an append-only reversal entry in point_ledger for an audited event.
 * Negates original points exactly and uses a deterministic idempotency_key to prevent double reversals.
 */
export async function emitReversalEvent(
  targetEventId: string,
  reason?: string,
  options?: { supabaseClient?: unknown }
): Promise<EmitReversalResult> {
  let supabase = options?.supabaseClient as any;
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(url, key);
    }
  }

  if (!supabase) {
    return { success: false, error: 'Koneksi Supabase tidak tersedia' };
  }

  const reversalKey = `reversal-${targetEventId}`;

  try {
    // 1. Cek idempotensi: apakah reversal sudah pernah dicatat
    const { data: existingRev } = await supabase
      .from('point_ledger')
      .select('id, points')
      .eq('idempotency_key', reversalKey)
      .maybeSingle();

    if (existingRev) {
      return {
        success: true,
        idempotent: true,
        points: Number(existingRev.points || 0),
        eventId: existingRev.id,
      };
    }

    // 2. Ambil event asal berdasarkan id (bila UUID), idempotency_key, atau event_id
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEventId);
    const cond = isTargetUuid
      ? `id.eq.${targetEventId},idempotency_key.eq.${targetEventId},event_id.eq.${targetEventId}`
      : `idempotency_key.eq.${targetEventId},event_id.eq.${targetEventId}`;
    const { data: orig, error: findErr } = await supabase
      .from('point_ledger')
      .select('*')
      .or(cond)
      .maybeSingle();

    if (findErr || !orig) {
      return {
        success: false,
        error: `Event asal '${targetEventId}' tidak ditemukan di point_ledger`,
      };
    }

    const origPoints = Number(orig.points || 0);
    const reversalPoints = -origPoints;

    // 3. Masukkan entri reversal negatif (append-only)
    const { data: revRow, error: insertErr } = await supabase
      .from('point_ledger')
      .insert({
        person_id: orig.person_id,
        branch_id: orig.branch_id,
        task_code: orig.task_code,
        task_name_snapshot: `Reversal: ${orig.task_name_snapshot}`,
        points_per_unit_snapshot: orig.points_per_unit_snapshot,
        source_app: orig.source_app,
        event_id: reversalKey,
        idempotency_key: reversalKey,
        quantity: 1,
        points: reversalPoints,
        shift_date: orig.shift_date,
        occurred_at: new Date().toISOString(),
        meta: {
          reversal_of: targetEventId,
          original_event_id: orig.id,
          reason: reason || 'Audit Zero Point',
        },
      })
      .select('id, points')
      .single();

    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        const { data: racedRev } = await supabase
          .from('point_ledger')
          .select('id, points')
          .eq('idempotency_key', reversalKey)
          .maybeSingle();
        if (racedRev) {
          return {
            success: true,
            idempotent: true,
            points: Number(racedRev.points || 0),
            eventId: racedRev.id,
          };
        }
      }
      return {
        success: false,
        error: `Gagal mencatat reversal di point_ledger: ${insertErr.message}`,
      };
    }

    return {
      success: true,
      idempotent: false,
      points: reversalPoints,
      eventId: revRow.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Kesalahan eksekusi reversal',
    };
  }
}
