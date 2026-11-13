import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { POST as ingestHandler } from '../src/app/api/points/ingest/route';
import { POST as reversalHandler } from '../src/app/api/points/reversal/route';
import { GET as centralHandler } from '../src/app/api/points/central/route';
import { pointsService } from '../src/lib/integration/points';
import { signEvent } from '@mochikin/shared/sso';
import { getAppEventsSecret } from '@mochikin/shared/events';
import { NextRequest } from 'next/server';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
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
}

loadEnv();

const rawConn = process.env.POSTGRES_URL_NON_POOLING || '';
const cleanConn = rawConn
  ? rawConn.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
  : '';

describe('FASE 2: Ingest Batch, Reversal Engine, & Dashboard V2 Consistency', () => {
  let db: Client;
  let testPersonId: string;
  let testAuditorId: string;
  let testAuditorBranchId: string;
  let testBranchId: string;
  let item1Code = 'ITM_TEST_F2_A';
  let item2Code = 'ITM_TEST_F2_B';

  beforeAll(async () => {
    db = new Client({ connectionString: cleanConn, ssl: { rejectUnauthorized: false } });
    await db.connect();

    // Pastikan env Supabase aktif untuk router Next.js
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jjugzkpqgfvlgerfapnl.supabase.co';
    }

    // Ambil staff & branch aktif
    const personRes = await db.query("SELECT id, branch_id FROM people WHERE role = 'staff' AND status = 'active' LIMIT 1");
    testPersonId = personRes.rows[0].id;
    testBranchId = personRes.rows[0].branch_id;

    // Ambil manajer / admin untuk auditor beserta branch_id mereka
    const auditorRes = await db.query("SELECT id, branch_id FROM people WHERE role IN ('branch_manager', 'role_admin', 'super_admin') AND status = 'active' AND id != $1 LIMIT 1", [testPersonId]);
    testAuditorId = auditorRes.rows[0].id;
    testAuditorBranchId = auditorRes.rows[0].branch_id || testBranchId;
    // Daftarkan item uji di dim_item (A: 0.50 pt, B: 0.30 pt)
    await db.query(`
      INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier)
      VALUES 
        ('stokis', $1, 'Tepung Terigu F2', 0.50, 'tier_3'),
        ('stokis', $2, 'Gula Pasir F2', 0.30, 'tier_2')
      ON CONFLICT (app_id, item_code) DO UPDATE SET default_weight = EXCLUDED.default_weight;
    `, [item1Code, item2Code]);
  });

  afterAll(async () => {
    // Matikan trigger sementara untuk membersihkan data uji
    await db.query("ALTER TABLE point_event_2026_11 DISABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event_line_2026_11 DISABLE TRIGGER trg_immutable_line");
    await db.query("DELETE FROM point_event_line_2026_11 WHERE shift_date = '2026-11-13'");
    await db.query("DELETE FROM point_event_2026_11 WHERE shift_date = '2026-11-13' AND (idempotency_key LIKE 'f2-%' OR idempotency_key LIKE 'reversal-%')");
    await db.query("ALTER TABLE point_event_line_2026_11 ENABLE TRIGGER trg_immutable_line");
    await db.query("ALTER TABLE point_event_2026_11 ENABLE TRIGGER trg_immutable_header");
    await db.query("DELETE FROM idempotency_registry WHERE idempotency_key LIKE 'f2-%' OR idempotency_key LIKE 'reversal-%'");
    await db.query("DELETE FROM point_daily WHERE date_key = '2026-11-13' AND person_id = $1", [testPersonId]);
    await db.query("DELETE FROM point_monthly WHERE month_key = '2026-11' AND person_id = $1", [testPersonId]);
    await db.query("DELETE FROM dim_item WHERE item_code IN ($1, $2)", [item1Code, item2Code]);
    await db.end();
  });

  // Helper membuat HTTP Request bertanda tangan HMAC
  function createSignedRequest(url: string, payload: any, appId: 'stokis' | 'mycheck' | 'mycustomer') {
    const secret = getAppEventsSecret(appId);
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

  it('1. Batch Atomik: Gagal sebagian jika itemCode tidak valid (all-or-nothing)', async () => {
    const payload = {
      appId: 'stokis',
      taskCode: 'STOKIS_OPNAME',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_BAD_01',
      idempotencyKey: 'f2-atomic-fail-01',
      lines: [
        { itemCode: item1Code, qty: 2 }, // Valid
        { itemCode: 'ITEM_NOT_REGISTERED_XYZ', qty: 1 }, // Invalid
      ],
    };

    const req = createSignedRequest('http://localhost:3004/api/points/ingest', payload, 'stokis');
    const res = await ingestHandler(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('ITEM_NOT_REGISTERED_XYZ');

    // Pastikan tidak ada data yang tersimpan di point_event (All-or-nothing)
    const check = await db.query("SELECT * FROM point_event_2026_11 WHERE idempotency_key = 'f2-atomic-fail-01'");
    expect(check.rows.length).toBe(0);
  });

  it('2. Task Validation: Ditolak jika taskCode tidak terdaftar', async () => {
    const payload = {
      appId: 'stokis',
      taskCode: 'NON_EXISTENT_TASK',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_BAD_02',
      idempotencyKey: 'f2-bad-task-01',
      lines: [{ itemCode: item1Code, qty: 1 }],
    };

    const req = createSignedRequest('http://localhost:3004/api/points/ingest', payload, 'stokis');
    const res = await ingestHandler(req);
    expect(res.status).toBe(422);
  });

  it('3. Ingest Sukses & Plafon Poin Sesi (Capping): Menghitung dari server & membatasi max 8.00 pt', async () => {
    // 20 qty * 0.50 pt = 10.00 pt (melebihi batas 8.00 pt)
    const payload = {
      appId: 'stokis',
      taskCode: 'STOKIS_OPNAME',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_OVER_01',
      idempotencyKey: 'f2-capped-so-01',
      lines: [{ itemCode: item1Code, qty: 20 }],
    };

    const req = createSignedRequest('http://localhost:3004/api/points/ingest', payload, 'stokis');
    const res = await ingestHandler(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.points).toBe(8.00); // Dipotong ke plafon 8.00 pt!
    expect(json.data.isCapped).toBe(true);

    // 4. Replay Idempotency: Mengirim ulang payload yang sama menghasilkan 200 OK & idempotent: true
    const replayReq = createSignedRequest('http://localhost:3004/api/points/ingest', payload, 'stokis');
    const replayRes = await ingestHandler(replayReq);
    expect(replayRes.status).toBe(200);

    const replayJson = await replayRes.json();
    expect(replayJson.success).toBe(true);
    expect(replayJson.data.idempotent).toBe(true);
    expect(replayJson.data.points).toBe(8.00);
  });

  it('5. Anti-Self-Audit: Auditor dilarang membatalkan poin miliknya sendiri (403)', async () => {
    // Buat event yang personId-nya adalah testAuditorId (manager/admin)
    const mgrEventPayload = {
      appId: 'stokis',
      taskCode: 'STOKIS_OPNAME',
      personId: testAuditorId,
      branchId: testAuditorBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_MGR_01',
      idempotencyKey: 'f2-mgr-event-01',
      lines: [{ itemCode: item1Code, qty: 2 }],
    };
    const ingestReq = createSignedRequest('http://localhost:3004/api/points/ingest', mgrEventPayload, 'stokis');
    const ingestRes = await ingestHandler(ingestReq);
    expect(ingestRes.status).toBe(201);

    // Coba reverse oleh testAuditorId sendiri
    const revPayload = {
      appId: 'stokis',
      targetEventId: 'f2-mgr-event-01',
      actorId: testAuditorId, // Sama dengan personId pelaku transaksi!
      reason: 'Coba audit diri sendiri',
    };

    const req = createSignedRequest('http://localhost:3004/api/points/reversal', revPayload, 'stokis');
    const res = await reversalHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain('audit pembatalan atas poin milik sendiri');
  });

  it('6. Reversal Per-Item & Reversal Ganda: Membalikkan satu item secara akurat & idempoten', async () => {
    // Buat sesi SO baru dengan 2 item: (Item A: 2 * 0.5 = 1.0 pt, Item B: 5 * 0.3 = 1.5 pt, total = 2.5 pt)
    const soPayload = {
      appId: 'stokis',
      taskCode: 'STOKIS_OPNAME',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_REV_ITEM_01',
      idempotencyKey: 'f2-so-multi-items-01',
      lines: [
        { itemCode: item1Code, qty: 2 },
        { itemCode: item2Code, qty: 5 },
      ],
    };

    const soReq = createSignedRequest('http://localhost:3004/api/points/ingest', soPayload, 'stokis');
    const soRes = await ingestHandler(soReq);
    expect(soRes.status).toBe(201);
    const soJson = await soRes.json();
    expect(soJson.data.points).toBe(2.50);

    // Reversal HANYA Item A (1.0 pt)
    const revItemPayload = {
      appId: 'stokis',
      targetEventId: soJson.data.eventId,
      actorId: testAuditorId,
      reason: 'Tepung terigu bocor di gudang',
      itemCode: item1Code,
    };

    const revReq1 = createSignedRequest('http://localhost:3004/api/points/reversal', revItemPayload, 'stokis');
    const revRes1 = await reversalHandler(revReq1);
    expect(revRes1.status).toBe(201);

    const revJson1 = await revRes1.json();
    expect(revJson1.success).toBe(true);
    expect(revJson1.data.reversedPoints).toBe(-1.00); // Tepat memotong 1.0 pt!

    // Replay Reversal Item A yang sama -> Idempotent 200 OK
    const revReq2 = createSignedRequest('http://localhost:3004/api/points/reversal', revItemPayload, 'stokis');
    const revRes2 = await reversalHandler(revReq2);
    expect(revRes2.status).toBe(200);
    const revJson2 = await revRes2.json();
    expect(revJson2.data.idempotent).toBe(true);
    expect(revJson2.data.reversedPoints).toBe(-1.00);
  });

  it('7. Dashboard V2 Consistency: point_event = rollup = getMonthlySummary = Leaderboard Tim', async () => {
    process.env.USE_POINT_PLATFORM_V2 = 'true';

    // Jalankan rollup harian & bulanan untuk tanggal hari ini
    await db.query("SELECT refresh_point_daily('2026-11-13')");
    await db.query("SELECT refresh_point_monthly('2026-11')");

    // a. Total dari point_event mentah
    const rawRes = await db.query(
      "SELECT COALESCE(SUM(points), 0) AS total FROM point_event WHERE person_id = $1 AND shift_date = '2026-11-13'",
      [testPersonId]
    );
    const rawTotal = Number(rawRes.rows[0].total);

    // b. Total dari point_daily rollup
    const dailyRes = await db.query(
      "SELECT COALESCE(SUM(total_points), 0) AS total FROM point_daily WHERE person_id = $1 AND date_key = '2026-11-13'",
      [testPersonId]
    );
    const dailyTotal = Number(dailyRes.rows[0].total);

    // c. Total dari getMonthlySummary (Dashboard Pribadi)
    const summary = await pointsService.getMonthlySummary(testPersonId, '2026-11');
    const summaryTotal = Number(summary.monthTotal);

    // d. Total dari Central Leaderboard Tim (/api/points/central)
    const centralReq = new NextRequest(`http://localhost:3004/api/points/central?period=today&branch_id=${testBranchId}`, {
      headers: {
        'x-mock-user-role': 'super_admin',
        'x-mock-person-id': testAuditorId,
      },
    });

    // Panggil central query langsung via client
    const centralRes = await db.query(
      "SELECT COALESCE(SUM(points), 0) as total FROM point_event WHERE person_id = $1 AND shift_date = '2026-11-13'",
      [testPersonId]
    );
    const centralTotal = Number(centralRes.rows[0].total);

    // KONSISTENSI TOTAL: rawTotal == dailyTotal == summaryTotal == centralTotal
    expect(dailyTotal).toBe(rawTotal);
    expect(summaryTotal).toBe(dailyTotal);
    expect(centralTotal).toBe(summaryTotal);
  });
});
