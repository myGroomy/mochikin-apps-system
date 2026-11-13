import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { getBackoffDelayMs, enqueueAndProcessOutbox } from '../../../apps/mycheck/lib/outbox-service';
import { POST as ingestHandler } from '../src/app/api/points/ingest/route';
import { signEvent } from '@mochikin/shared/sso';
import { getAppEventsSecret } from '@mochikin/shared/events';

function loadEnvFile(relPath: string) {
  const fullPath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  for (const l of lines) {
    const match = l.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvFile('../../../.env');
loadEnvFile('../../../apps/mycheck/.env.local');

const rawConn = process.env.POSTGRES_URL_NON_POOLING || '';
const cleanConn = rawConn ? rawConn.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '') : '';

describe('FASE 3 - Iterasi 3: Integrasi Modul MyCheck (Proporsional Shift Checklist & Outbox)', () => {
  let db: Client;
  let testPersonId: string;
  let testBranchId: string;
  const todayStr = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    db = new Client({ connectionString: cleanConn, ssl: { rejectUnauthorized: false } });
    await db.connect();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jjugzkpqgfvlgerfapnl.supabase.co';
    }

    const pRes = await db.query("SELECT id, branch_id FROM people WHERE role = 'staff' AND status = 'active' LIMIT 1");
    testPersonId = pRes.rows[0].id;
    testBranchId = pRes.rows[0].branch_id;
  });

  afterAll(async () => {
    // Bersihkan entri uji di partisi & registry
    await db.query("ALTER TABLE point_event DISABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("ALTER TABLE point_event_2026_11 DISABLE TRIGGER trg_immutable_header");
    await db.query("DELETE FROM point_event_2026_11 WHERE idempotency_key LIKE 'test-f3-mc-%'");
    await db.query("ALTER TABLE point_event_2026_11 ENABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event ENABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("DELETE FROM idempotency_registry WHERE idempotency_key LIKE 'test-f3-mc-%'");
    await db.end();
  });

  function createSignedRequest(url: string, payload: any) {
    const secret = getAppEventsSecret('mycheck');
    const bodyStr = JSON.stringify(payload);
    const sig = signEvent(payload, secret);
    return new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Signature': sig,
      },
      body: bodyStr,
    });
  }

  it('1. Outbox Capped Exponential Backoff: Dibatasi maksimal 5 menit (300.000 ms)', () => {
    expect(getBackoffDelayMs(1)).toBe(5000);
    expect(getBackoffDelayMs(2)).toBe(10000);
    expect(getBackoffDelayMs(3)).toBe(20000);
    expect(getBackoffDelayMs(4)).toBe(40000);
    expect(getBackoffDelayMs(7)).toBe(300000); // capped at 5 minutes
    expect(getBackoffDelayMs(15)).toBe(300000);
  });

  it('2. Outbox Resiliensi: Menahan event dengan status pending saat offline', async () => {
    const testSpreadsheetId = 'mock_spreadsheet_mycheck_outbox';
    const idemKey = `test-f3-mc-offline-${Date.now()}`;

    const sessionPayload = {
      appId: 'mycheck' as const,
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: todayStr,
      occurredAt: new Date().toISOString(),
      sessionRef: 'SHIFT_MC_OFFLINE_01',
      idempotencyKey: idemKey,
      meta: { ratio: 0.8 },
    };

    const origUrl = process.env.MYPERFORMANCE_URL;
    process.env.MYPERFORMANCE_URL = 'http://127.0.0.1:59999';

    const inMemoryOutbox: any[] = [];
    try {
      const res = await enqueueAndProcessOutbox(testSpreadsheetId, {
        eventType: 'session_ingest',
        idempotencyKey: idemKey,
        payload: sessionPayload,
      }, { inMemoryOutbox });

      expect(res.success).toBe(false);
      expect(res.status).toBe('pending');
      expect(res.outboxId).toBeDefined();
      expect(inMemoryOutbox.length).toBe(1);
      expect(inMemoryOutbox[0][4]).toBe('pending');
    } finally {
      process.env.MYPERFORMANCE_URL = origUrl;
    }
  });

  it('3. Poin Shift Proporsional Mengikuti Rasio Kepatuhan Checklist Gerai', async () => {
    // Skenario A: Kepatuhan 100% (ratio = 1.0) -> 2.00 pt * 1.0 = 2.00 pt
    const payload100 = {
      appId: 'mycheck' as const,
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SHIFT_MC_100',
      idempotencyKey: 'test-f3-mc-ratio-100',
      meta: { ratio: 1.0, scoreFinal: 25, scoreAvailable: 25 },
    };

    const req100 = createSignedRequest('http://localhost:3004/api/points/ingest', payload100);
    const res100 = await ingestHandler(req100);
    expect(res100.status).toBe(201);
    const json100 = await res100.json();
    expect(json100.data.points).toBe(2.00);

    // Skenario B: Kepatuhan 80% (ratio = 0.80) -> 2.00 pt * 0.80 = 1.60 pt
    const payload80 = {
      appId: 'mycheck' as const,
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SHIFT_MC_80',
      idempotencyKey: 'test-f3-mc-ratio-80',
      meta: { ratio: 0.8, scoreFinal: 20, scoreAvailable: 25 },
    };

    const req80 = createSignedRequest('http://localhost:3004/api/points/ingest', payload80);
    const res80 = await ingestHandler(req80);
    expect(res80.status).toBe(201);
    const json80 = await res80.json();
    expect(json80.data.points).toBe(1.60);

    // Skenario C: Kepatuhan 50% (ratio = 0.50) -> 2.00 pt * 0.50 = 1.00 pt
    const payload50 = {
      appId: 'mycheck' as const,
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SHIFT_MC_50',
      idempotencyKey: 'test-f3-mc-ratio-50',
      meta: { ratio: 0.5, scoreFinal: 10, scoreAvailable: 20 },
    };

    const req50 = createSignedRequest('http://localhost:3004/api/points/ingest', payload50);
    const res50 = await ingestHandler(req50);
    expect(res50.status).toBe(201);
    const json50 = await res50.json();
    expect(json50.data.points).toBe(1.00);
  });
});
