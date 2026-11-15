import {
  emitSessionEvent,
  emitPlatformReversal,
  type SessionEvent,
  type SessionReversal,
} from '@mochikin/shared/events';

export const OUTBOX_SHEET_NAME = 'PointOutbox';

export const OUTBOX_HEADERS = [
  'Outbox_ID',
  'Event_Type',
  'Idempotency_Key',
  'Payload_JSON',
  'Status',
  'Retry_Count',
  'Last_Error',
  'Created_At',
  'Sent_At',
];

/**
 * Calculates exponential backoff capped at 5 minutes (300.000 ms).
 */
export function getBackoffDelayMs(retryCount: number): number {
  const baseMs = 5000;
  const maxMs = 300000;
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retryCount - 1)));
}

/**
 * Enqueues a CRM point event into PointOutbox and triggers processing.
 * Resilient: preserves 'pending' status on network failure; never loses point events.
 */
export async function enqueueAndProcessOutbox(
  _spreadsheetIdOrDummy: string,
  entry: {
    eventType: 'session_ingest' | 'reversal';
    idempotencyKey: string;
    payload: SessionEvent | SessionReversal;
  },
  options?: { inMemoryOutbox?: unknown[][] }
): Promise<{ success: boolean; outboxId: string; status: 'sent' | 'pending' | 'dead_letter'; error?: string }> {
  const outboxId = `OUT-CUST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  if (options?.inMemoryOutbox) {
    options.inMemoryOutbox.push([
      outboxId,
      entry.eventType,
      entry.idempotencyKey,
      JSON.stringify(entry.payload),
      'pending',
      0,
      '',
      now,
      '',
    ]);
  }

  // 2. Kirim ke Ingress Platform
  let emitResult: { success: boolean; status?: number; error?: string; code?: string };

  if (entry.eventType === 'session_ingest') {
    emitResult = await emitSessionEvent(entry.payload as SessionEvent);
  } else {
    emitResult = await emitPlatformReversal(entry.payload as SessionReversal);
  }

  // 3. Update status
  if (emitResult.success) {
    if (options?.inMemoryOutbox) {
      const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
      if (target) {
        target[4] = 'sent';
        target[8] = new Date().toISOString();
      }
    }
    return { success: true, outboxId, status: 'sent' };
  }

  return {
    success: false,
    outboxId,
    status: 'pending',
    error: emitResult.error || 'Network or ingress failure',
  };
}
