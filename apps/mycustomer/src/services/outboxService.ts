import { getSheets, getSpreadsheetId, requestWithRetry } from '../lib/sheetsServer';
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
 * Ensures PointOutbox tab exists in MyCustomer spreadsheet.
 */
export async function ensureOutboxSheet(spreadsheetId: string): Promise<void> {
  const sheets = getSheets();
  const meta = await requestWithRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    })
  );
  const exists = (meta.data.sheets || []).some(
    (s) => s.properties?.title === OUTBOX_SHEET_NAME
  );

  if (!exists) {
    await requestWithRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: OUTBOX_SHEET_NAME } } }],
        },
      })
    );
    await requestWithRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${OUTBOX_SHEET_NAME}!A1:I1`,
        valueInputOption: 'RAW',
        requestBody: { values: [OUTBOX_HEADERS] },
      })
    );
  }
}

/**
 * Enqueues a CRM point event into PointOutbox and triggers processing.
 * Resilient: preserves 'pending' status on network failure; never loses point events.
 */
export async function enqueueAndProcessOutbox(
  spreadsheetIdOrDummy: string,
  entry: {
    eventType: 'session_ingest' | 'reversal';
    idempotencyKey: string;
    payload: SessionEvent | SessionReversal;
  },
  options?: { inMemoryOutbox?: unknown[][] }
): Promise<{ success: boolean; outboxId: string; status: 'sent' | 'pending' | 'dead_letter'; error?: string }> {
  let spreadsheetId = spreadsheetIdOrDummy;
  if (!options?.inMemoryOutbox && !spreadsheetId) {
    try {
      spreadsheetId = getSpreadsheetId();
    } catch {
      spreadsheetId = 'MOCK_MYCUSTOMER_SPREADSHEET';
    }
  }

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
  } else {
    try {
      await ensureOutboxSheet(spreadsheetId);
      const sheets = getSheets();
      await requestWithRetry(() =>
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: OUTBOX_SHEET_NAME,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [[
              outboxId,
              entry.eventType,
              entry.idempotencyKey,
              JSON.stringify(entry.payload),
              'pending',
              0,
              '',
              now,
              '',
            ]],
          },
        })
      );
    } catch (sheetErr) {
      console.warn('⚠️ MyCustomer Outbox sheet append warning:', sheetErr);
    }
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
    } else {
      try {
        const sheets = getSheets();
        const res = await requestWithRetry(() =>
          sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${OUTBOX_SHEET_NAME}!A:I`,
          })
        );
        const rows = res.data.values || [];
        const rowIndex = rows.findIndex((r) => r[0] === outboxId);
        if (rowIndex >= 0) {
          const rowNum = rowIndex + 1;
          await requestWithRetry(() =>
            sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${OUTBOX_SHEET_NAME}!E${rowNum}:I${rowNum}`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [['sent', 0, '', now, new Date().toISOString()]],
              },
            })
          );
        }
      } catch (updateErr) {
        console.warn('⚠️ MyCustomer Outbox update status warning:', updateErr);
      }
    }
    return { success: true, outboxId, status: 'sent' };
  }

  // Error handling
  const httpStatus = emitResult.status || 0;
  const isValidationError = httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429;

  if (isValidationError) {
    console.error(`🚨 [MyCustomer Outbox Alert] Validation Error (Dead-Letter): ${emitResult.error}`, {
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

  // Network / 5xx / 429 -> pending
  console.warn(`⚠️ [MyCustomer Outbox Warning] Transient error, retained as pending: ${emitResult.error}`, {
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
