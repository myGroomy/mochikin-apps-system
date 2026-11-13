import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { POST as ingestHandler } from '../src/app/api/points/ingest/route';
import { POST as reversalHandler } from '../src/app/api/points/reversal/route';
import { pointsService } from '../src/lib/integration/points';
import { getSupabaseAdmin } from '../src/lib/supabase';
import { signEvent } from '@mochikin/shared/sso';
import { getAppEventsSecret } from '@mochikin/shared/events';
import {
  createPointPlatformBackup,
  restorePointPlatform,
  type PlatformBackupData,
} from '../../../scripts/backup-restore-point-platform';

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
loadEnvFile('../../../apps/myperformance/.env.local');

const rawConn = process.env.POSTGRES_URL_NON_POOLING || '';
const cleanConn = rawConn ? rawConn.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '') : '';

describe('FASE 6: Uji Akhir E2E Lintas App, Uji Beban Peak Hour, & Pemulihan Backup', () => {
  let db: Client;
  let testPersonId: string;
  let testAuditorId: string;
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

    const aRes = await db.query("SELECT id FROM people WHERE role IN ('branch_manager', 'role_admin', 'super_admin') AND status = 'active' AND id != $1 LIMIT 1", [testPersonId]);
    testAuditorId = aRes.rows[0].id;

    // Bersihkan residu uji lama
    await db.query("ALTER TABLE point_event DISABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("ALTER TABLE point_event_line DISABLE TRIGGER trg_point_line_parent_immutable");
    await db.query("ALTER TABLE point_event_2026_11 DISABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event_line_2026_11 DISABLE TRIGGER trg_immutable_line");
    await db.query("DELETE FROM point_event_line_2026_11 WHERE shift_date IN ('2026-11-01', '2026-11-13')");
    await db.query("DELETE FROM point_event_2026_11 WHERE shift_date IN ('2026-11-01', '2026-11-13') AND (idempotency_key LIKE 'f6-%' OR idempotency_key LIKE 'reversal-%')");
    await db.query("ALTER TABLE point_event_line_2026_11 ENABLE TRIGGER trg_immutable_line");
    await db.query("ALTER TABLE point_event_2026_11 ENABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event_line ENABLE TRIGGER trg_point_line_parent_immutable");
    await db.query("ALTER TABLE point_event ENABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("DELETE FROM idempotency_registry WHERE idempotency_key LIKE 'f6-%' OR idempotency_key LIKE 'reversal-%'");
    await db.query("DELETE FROM point_daily WHERE date_key IN ('2026-11-01', '2026-11-13') AND person_id = $1", [testPersonId]);
    await db.query("DELETE FROM point_monthly WHERE month_key = '2026-11' AND person_id = $1", [testPersonId]);

    // Daftarkan item uji di dim_item
    await db.query(`
      INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier)
      VALUES 
        ('stokis', 'ITM_F6_AYAM', 'Ayam Marinasi F6', 0.50, 'tier_3'),
        ('stokis', 'ITM_F6_TEPUNG', 'Tepung Ketan F6', 0.30, 'tier_2')
      ON CONFLICT (app_id, item_code) DO UPDATE SET default_weight = EXCLUDED.default_weight;
    `);
  });

  afterAll(async () => {
    // Bersihkan data uji setelah selesai
    await db.query("ALTER TABLE point_event DISABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("ALTER TABLE point_event_line DISABLE TRIGGER trg_point_line_parent_immutable");
    await db.query("ALTER TABLE point_event_2026_11 DISABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event_line_2026_11 DISABLE TRIGGER trg_immutable_line");
    await db.query("DELETE FROM point_event_line_2026_11 WHERE shift_date IN ('2026-11-01', '2026-11-13')");
    await db.query("DELETE FROM point_event_2026_11 WHERE shift_date IN ('2026-11-01', '2026-11-13') AND (idempotency_key LIKE 'f6-%' OR idempotency_key LIKE 'reversal-%')");
    await db.query("ALTER TABLE point_event_line_2026_11 ENABLE TRIGGER trg_immutable_line");
    await db.query("ALTER TABLE point_event_2026_11 ENABLE TRIGGER trg_immutable_header");
    await db.query("ALTER TABLE point_event_line ENABLE TRIGGER trg_point_line_parent_immutable");
    await db.query("ALTER TABLE point_event ENABLE TRIGGER trg_point_event_parent_immutable");
    await db.query("DELETE FROM idempotency_registry WHERE idempotency_key LIKE 'f6-%' OR idempotency_key LIKE 'reversal-%'");
    await db.query("DELETE FROM point_daily WHERE date_key IN ('2026-11-01', '2026-11-13') AND person_id = $1", [testPersonId]);
    await db.query("DELETE FROM point_monthly WHERE month_key = '2026-11' AND person_id = $1", [testPersonId]);
    await db.query("DELETE FROM dim_item WHERE item_code IN ('ITM_F6_AYAM', 'ITM_F6_TEPUNG')");
    await db.end();
  });

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

  it('1. E2E Lintas App: Tutup Shift (Proporsional), SO + Zero Point per-item, WA CRM, & Insiden', async () => {
    // a. MyCheck: Tutup Shift kepatuhan 80% (2.00 pt * 0.8 = 1.60 pt)
    const shiftReq = createSignedRequest('http://localhost:3004/api/points/ingest', {
      appId: 'mycheck',
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: todayStr,
      occurredAt: `${todayStr}T15:00:00+07:00`,
      sessionRef: 'SHIFT_E2E_FINAL_01',
      idempotencyKey: 'f6-mc-shift-final',
      meta: { ratio: 0.8 },
    }, 'mycheck');
    const shiftRes = await ingestHandler(shiftReq);
    expect(shiftRes.status).toBe(201);
    const shiftJson = await shiftRes.json();
    expect(shiftJson.data.points).toBe(1.60);

    // b. Stokis: Submit SO 2 item (Ayam 2 qty * 0.50 = 1.00 pt, Tepung 5 qty * 0.30 = 1.50 pt, total = 2.50 pt)
    const soReq = createSignedRequest('http://localhost:3004/api/points/ingest', {
      appId: 'stokis',
      taskCode: 'STOKIS_OPNAME',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: todayStr,
      occurredAt: `${todayStr}T17:30:00+07:00`,
      sessionRef: 'SO_E2E_FINAL_01',
      idempotencyKey: 'f6-stokis-so-final',
      lines: [
        { itemCode: 'ITM_F6_AYAM', qty: 2 },
        { itemCode: 'ITM_F6_TEPUNG', qty: 5 },
      ],
    }, 'stokis');
    const soRes = await ingestHandler(soReq);
    expect(soRes.status).toBe(201);
    const soJson = await soRes.json();
    expect(soJson.data.points).toBe(2.50);

    // c. Stokis: Zero Point per-item pada ITM_F6_AYAM (-1.00 pt)
    const revReq = createSignedRequest('http://localhost:3004/api/points/reversal', {
      appId: 'stokis',
      targetEventId: soJson.data.eventId,
      actorId: testAuditorId,
      reason: 'Ayam susut timbangan chiller',
      itemCode: 'ITM_F6_AYAM',
    }, 'stokis');
    const revRes = await reversalHandler(revReq);
    expect(revRes.status).toBe(201);
    const revJson = await revRes.json();
    expect(revJson.data.reversedPoints).toBe(-1.00);

    // d. MyCustomer: WA Follow-Up (1.00 pt)
    const waReq = createSignedRequest('http://localhost:3004/api/points/ingest', {
      appId: 'mycustomer',
      taskCode: 'MYCUST_WA',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: todayStr,
      occurredAt: `${todayStr}T18:00:00+07:00`,
      sessionRef: 'ORD_E2E_FINAL_01',
      idempotencyKey: 'f6-cust-wa-final',
    }, 'mycustomer');
    const waRes = await ingestHandler(waReq);
    expect(waRes.status).toBe(201);
    const waJson = await waRes.json();
    expect(waJson.data.points).toBe(1.00);

    // e. Insiden: Pelaporan insiden operasional (+1.50 pt)
    const incReq = createSignedRequest('http://localhost:3004/api/points/ingest', {
      appId: 'mycheck',
      taskCode: 'MYCHECK_INCIDENT',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: todayStr,
      occurredAt: `${todayStr}T19:00:00+07:00`,
      sessionRef: 'INC_E2E_FINAL_01',
      idempotencyKey: 'f6-mc-inc-final',
    }, 'mycheck');
    const incRes = await ingestHandler(incReq);
    expect(incRes.status).toBe(201);
    const incJson = await incRes.json();
    expect(incJson.data.points).toBe(1.50);

    // Hitung total netto hari ini: 1.60 + 2.50 - 1.00 + 1.00 + 1.50 = 5.60 pt
    const rawSum = await db.query(
      "SELECT COALESCE(SUM(points), 0) AS total FROM point_event WHERE person_id = $1 AND shift_date = $2",
      [testPersonId, todayStr]
    );
    expect(Number(rawSum.rows[0].total)).toBe(5.60);

    // Jalankan rollup harian & bulanan
    await db.query("SELECT refresh_point_daily($1)", [todayStr]);
    await db.query("SELECT refresh_point_monthly('2026-11')");

    // Konsistensi 3 Tampilan
    process.env.USE_POINT_PLATFORM_V2 = 'true';
    const summary = await pointsService.getMonthlySummary(testPersonId, '2026-11');
    expect(Number(summary.monthTotal)).toBe(5.60);
  });

  it('2. Data Campuran Hari Lalu + Hari Ini: Integritas Rekap Tanpa Double-Counting', async () => {
    // Tambah transaksi hari lalu: '2026-11-01' (10.00 pt)
    const pastReq = createSignedRequest('http://localhost:3004/api/points/ingest', {
      appId: 'mycheck',
      taskCode: 'MYCHECK_SHIFT_CLOSE',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-01',
      occurredAt: '2026-11-01T21:00:00+07:00',
      sessionRef: 'SHIFT_E2E_PAST_01',
      idempotencyKey: 'f6-mc-shift-past',
      meta: { ratio: 1.0 }, // 2.00 pt
    }, 'mycheck');
    await ingestHandler(pastReq);

    // Rollup hari lalu
    await db.query("SELECT refresh_point_daily('2026-11-01')");
    await db.query("SELECT refresh_point_monthly('2026-11')");

    // Total bulan ini = 10.00 (lalu) + 5.60 (hari ini) = 15.60 pt (sebelumnya: 2 pt + 5.60 pt = 7.60 pt)
    // Cek di getMonthlySummary
    const mixedSummary = await pointsService.getMonthlySummary(testPersonId, '2026-11');
    const totalExpected = Number((2.00 + 5.60).toFixed(2)); // 2.00 dari past + 5.60 dari today
    expect(Number(mixedSummary.monthTotal)).toBe(totalExpected);
  });

  it('3. Uji Beban Ringan Jam Tutup Gerai (Simulasi Peak Hour 21:00-22:00 WIB)', async () => {
    // 20 concurrent request submit secara serentak ke /api/points/ingest
    const concurrency = 20;
    const promises: Promise<Response>[] = [];

    for (let i = 1; i <= concurrency; i++) {
      const p = {
        appId: 'mycustomer',
        taskCode: 'MYCUST_WA',
        personId: testPersonId,
        branchId: testBranchId,
        shiftDate: todayStr,
        occurredAt: new Date().toISOString(),
        sessionRef: `CONCURRENT_ORD_${i}`,
        idempotencyKey: `f6-concurrent-test-${i}`,
      };
      const req = createSignedRequest('http://localhost:3004/api/points/ingest', p, 'mycustomer');
      promises.push(ingestHandler(req));
    }

    const responses = await Promise.all(promises);
    expect(responses.length).toBe(concurrency);
    // Tidak boleh ada yang crash 500
    for (const res of responses) {
      expect([200, 201]).toContain(res.status);
    }
  });

  it('4. Uji Pemulihan Bencana (Disaster Recovery: Backup & Restore Verification)', async () => {
    const tempDir = path.resolve(__dirname, '../../../backups/test-f6-dr');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
      const supabaseAdmin = getSupabaseAdmin();
      // a. Eksekusi Backup
      const { backupPath, checksum, recordCount } = await createPointPlatformBackup({
        outputDir: tempDir,
        supabaseClient: supabaseAdmin,
      });
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(recordCount).toBeGreaterThanOrEqual(10);
      expect(checksum.length).toBe(64);

      // b. Uji Restore dari Berkas Cadangan
      const restoreRes = await restorePointPlatform(backupPath, { supabaseClient: supabaseAdmin });
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.checksumValid).toBe(true);
      expect(restoreRes.restoredCounts.ref_app).toBeGreaterThanOrEqual(3);
      expect(restoreRes.restoredCounts.point_config).toBeGreaterThanOrEqual(9);
    } finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
