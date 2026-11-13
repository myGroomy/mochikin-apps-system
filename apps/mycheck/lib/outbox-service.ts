import {
  ensureSheet,
  appendRows,
  writeRow,
  readSheetData,
  invalidateSheetCache,
} from './google/sheets';
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
 * Calculates exponential backoff with a 5-minute cap (300.000 ms).
 */
export function getBackoffDelayMs(retryCount: number): number {
  const baseMs = 5000;
  const maxMs = 300000;
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retryCount - 1)));
}

/**
 * Ensures PointOutbox sheet exists with correct headers in MyCheck branch spreadsheet.
 */
export async function ensureOutboxSheet(spreadsheetId: string): Promise<void> {
  await ensureSheet(spreadsheetId, OUTBOX_SHEET_NAME, OUTBOX_HEADERS);
}

/**
 * Enqueues an event to MyCheck PointOutbox and immediately attempts processing.
 * Resilient: retains 'pending' status on network failure; never loses shift events.
 */
export async function enqueueAndProcessOutbox(
  spreadsheetId: string,
  entry: {
    eventType: 'session_ingest' | 'reversal';
    idempotencyKey: string;
    payload: SessionEvent | SessionReversal;
  },
  options?: { inMemoryOutbox?: unknown[][] }
): Promise<{ success: boolean; outboxId: string; status: 'sent' | 'pending' | 'dead_letter'; error?: string }> {
  const outboxId = `OUT-MC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  } else {
    try {
      await ensureOutboxSheet(spreadsheetId);
      await appendRows(spreadsheetId, OUTBOX_SHEET_NAME, [[
        outboxId,
        entry.eventType,
        entry.idempotencyKey,
        JSON.stringify(entry.payload),
        'pending',
        0,
        '',
        now,
        '',
      ]]);
    } catch (sheetErr) {
      console.warn('⚠️ MyCheck Outbox sheet append warning:', sheetErr);
    }
  }

  // 2. Eksekusi pengiriman ke Ingress Platform
  let emitResult: { success: boolean; status?: number; error?: string; code?: string };

  if (entry.eventType === 'session_ingest') {
    emitResult = await emitSessionEvent(entry.payload as SessionEvent);
  } else {
    emitResult = await emitPlatformReversal(entry.payload as SessionReversal);
  }

  // 3. Update status baris outbox
  if (emitResult.success) {
    if (options?.inMemoryOutbox) {
      const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
      if (target) {
        target[4] = 'sent';
        target[8] = new Date().toISOString();
      }
    } else {
      try {
        const sheetData = await readSheetData(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
        const rowIndex = sheetData.rows.findIndex((r) => String(r[0]) === outboxId);
        if (rowIndex >= 0) {
          const rowNum = rowIndex + 2;
          await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNum}:I${rowNum}`, [
            'sent',
            0,
            '',
            now,
            new Date().toISOString(),
          ]);
        }
      } catch (updateErr) {
        console.warn('⚠️ MyCheck Outbox update status warning:', updateErr);
      }
    }
    return { success: true, outboxId, status: 'sent' };
  }

  // Penanganan error:
  const httpStatus = emitResult.status || 0;
  const isValidationError = httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429;

  if (isValidationError) {
    console.error(`🚨 [MyCheck Outbox Alert] Validation Error (Dead-Letter): ${emitResult.error}`, {
      outboxId,
      payload: entry.payload,
    });
    if (options?.inMemoryOutbox) {
      const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
      if (target) {
        target[4] = 'dead_letter';
        target[5] = 1;
        target[6] = emitResult.error || 'Validation error';
      }
    }
    return { success: false, outboxId, status: 'dead_letter', error: emitResult.error };
  }

  // Network / 5xx / 429 rate limit -> pending
  console.warn(`⚠️ [MyCheck Outbox Warning] Transient error, retained as pending: ${emitResult.error}`, {
    outboxId,
  });
  if (options?.inMemoryOutbox) {
    const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
    if (target) {
      target[4] = 'pending';
      target[5] = 1;
      target[6] = emitResult.error || 'Network error';
    }
  }
  return { success: false, outboxId, status: 'pending', error: emitResult.error };
}

/**
 * Worker: Flushes all pending rows in PointOutbox.
 */
export async function flushOutbox(spreadsheetId: string): Promise<{ processed: number; sent: number; failed: number }> {
  await ensureOutboxSheet(spreadsheetId);
  const sheetData = await readSheetData(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i];
    const outboxId = String(row[0] || '');
    const eventType = String(row[1] || '') as 'session_ingest' | 'reversal';
    const rawPayload = String(row[3] || '');
    const status = String(row[4] || '');
    const retryCount = Number(row[5] || 0);
    const rowNum = i + 2;

    if (status !== 'pending' && status !== 'failed') continue;

    processed++;
    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNum}:G${rowNum}`, [
        'dead_letter',
        retryCount + 1,
        'Invalid JSON payload in outbox',
      ]);
      failed++;
      continue;
    }

    let emitResult: { success: boolean; status?: number; error?: string };
    if (eventType === 'session_ingest') {
      emitResult = await emitSessionEvent(payload);
    } else {
      emitResult = await emitPlatformReversal(payload);
    }

    if (emitResult.success) {
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNum}:I${rowNum}`, [
        'sent',
        retryCount,
        '',
        String(row[7] || ''),
        new Date().toISOString(),
      ]);
      sent++;
    } else {
      const httpStatus = emitResult.status || 0;
      const isVal = httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429;
      const nextStatus = isVal ? 'dead_letter' : 'pending';
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNum}:G${rowNum}`, [
        nextStatus,
        retryCount + 1,
        emitResult.error || 'Retry failed',
      ]);
      failed++;
    }
  }

  return { processed, sent, failed };
}
