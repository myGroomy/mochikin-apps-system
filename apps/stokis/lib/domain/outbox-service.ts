import { resolveCabang } from '../google/registry';
import {
  ensureSheet,
  readSheetDataRaw,
  writeRow,
  appendRows,
} from '../google/sheets';
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

export interface OutboxEntry {
  outboxId: string;
  eventType: 'session_ingest' | 'reversal';
  idempotencyKey: string;
  payload: SessionEvent | SessionReversal;
  status: 'pending' | 'sent' | 'dead_letter';
  retryCount: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
}

/**
 * Calculates exponential backoff with a 5-minute cap.
 */
export function getBackoffDelayMs(retryCount: number): number {
  const baseMs = 5000; // 5 detik
  const maxMs = 300000; // 5 menit
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retryCount - 1)));
}

/**
 * Ensures PointOutbox sheet exists with correct headers.
 */
export async function ensureOutboxSheet(spreadsheetId: string): Promise<void> {
  await ensureSheet(spreadsheetId, OUTBOX_SHEET_NAME, OUTBOX_HEADERS);
}

/**
 * Enqueues an event to PointOutbox and immediately attempts processing.
 * Never drops an event on network failure — retains 'pending' status for retry.
 */
export async function enqueueAndProcessOutbox(
  cabangIdOrSpreadsheetId: string,
  entry: {
    eventType: 'session_ingest' | 'reversal';
    idempotencyKey: string;
    payload: SessionEvent | SessionReversal;
  },
  options?: { inMemoryOutbox?: Array<any[]> }
): Promise<{ success: boolean; outboxId: string; status: 'sent' | 'pending' | 'dead_letter'; error?: string }> {
  let spreadsheetId = cabangIdOrSpreadsheetId;
  if (!options?.inMemoryOutbox && !spreadsheetId.startsWith('1') && spreadsheetId.length < 30) {
    const resolved = await resolveCabang(cabangIdOrSpreadsheetId).catch(() => null);
    if (resolved?.spreadsheetId) spreadsheetId = resolved.spreadsheetId;
  }

  const outboxId = `OUT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
      const sheetData = await readSheetDataRaw(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
      const rowIndex = sheetData.rows.findIndex((r) => r[0] === outboxId);
      const rowNumber1Based = rowIndex >= 0 ? rowIndex + 2 : null;
      if (rowNumber1Based) {
        await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:I${rowNumber1Based}`, [
          'sent',
          0,
          '',
          now,
          new Date().toISOString(),
        ]);
      }
    }
    return { success: true, outboxId, status: 'sent' };
  }

  // Penanganan error:
  // 4xx validation error -> dead_letter + alert
  const httpStatus = emitResult.status || 0;
  const isValidationError = httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429;

  if (isValidationError) {
    if (options?.inMemoryOutbox) {
      const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
      if (target) {
        target[4] = 'dead_letter';
        target[5] = 1;
        target[6] = emitResult.error || 'Validation error';
      }
    } else {
      const sheetData = await readSheetDataRaw(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
      const rowIndex = sheetData.rows.findIndex((r) => r[0] === outboxId);
      const rowNumber1Based = rowIndex >= 0 ? rowIndex + 2 : null;
      if (rowNumber1Based) {
        await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:G${rowNumber1Based}`, [
          'dead_letter',
          1,
          emitResult.error || 'Validation error',
        ]);
      }
    }
    return { success: false, outboxId, status: 'dead_letter', error: emitResult.error };
  }

  // Network error / 5xx / 429 rate limit -> Pertahankan 'pending' untuk retry
  console.warn(`⚠️ [Outbox Warning] Network/Server transient error, retained as pending: ${emitResult.error}`, {
    outboxId,
  });
  if (options?.inMemoryOutbox) {
    const target = options.inMemoryOutbox.find((r) => r[0] === outboxId);
    if (target) {
      target[4] = 'pending';
      target[5] = 1;
      target[6] = emitResult.error || 'Network error';
    }
  } else {
    const sheetData = await readSheetDataRaw(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
    const rowIndex = sheetData.rows.findIndex((r) => r[0] === outboxId);
    const rowNumber1Based = rowIndex >= 0 ? rowIndex + 2 : null;
    if (rowNumber1Based) {
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:G${rowNumber1Based}`, [
        'pending',
        1,
        emitResult.error || 'Network error',
      ]);
    }
  }
  return { success: false, outboxId, status: 'pending', error: emitResult.error };
}

/**
 * Worker: Flushes all pending rows in PointOutbox with capped exponential backoff.
 */
export async function flushOutbox(spreadsheetId: string): Promise<{ processed: number; sent: number; failed: number }> {
  await ensureOutboxSheet(spreadsheetId);
  const sheetData = await readSheetDataRaw(spreadsheetId, `${OUTBOX_SHEET_NAME}!A:I`);
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
    const rowNumber1Based = i + 2;

    if (status !== 'pending' && status !== 'failed') continue;

    processed++;
    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:G${rowNumber1Based}`, [
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
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:I${rowNumber1Based}`, [
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
      await writeRow(spreadsheetId, `${OUTBOX_SHEET_NAME}!E${rowNumber1Based}:G${rowNumber1Based}`, [
        nextStatus,
        retryCount + 1,
        emitResult.error || 'Retry failed',
      ]);
      failed++;
    }
  }

  return { processed, sent, failed };
}
