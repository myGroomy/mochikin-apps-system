import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function getPostgresUrl(): string {
  if (process.env.POSTGRES_URL_NON_POOLING) return process.env.POSTGRES_URL_NON_POOLING;
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const l of lines) {
      const match = l.match(/^POSTGRES_URL_NON_POOLING\s*=\s*(.*)$/);
      if (match) return match[1].trim();
    }
  }
  return '';
}
const rawConn = getPostgresUrl();
const cleanConn = rawConn
  ? rawConn.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
  : '';

describe('FASE 1: Fondasi Database Point Platform (016_point_platform_schema)', () => {
  let client: Client;
  let testPersonId: string;
  let testBranchId: string;
  let testItemId: number;

  beforeAll(async () => {
    client = new Client({
      connectionString: cleanConn,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // Ambil branch & person aktif untuk foreign key test
    const personRes = await client.query("SELECT id, branch_id FROM people WHERE status = 'active' LIMIT 1");
    testPersonId = personRes.rows[0].id;
    testBranchId = personRes.rows[0].branch_id;

    // Buat item uji di dim_item
    const itemRes = await client.query(`
      INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier)
      VALUES ('stokis', 'E2E_TEST_ITEM_01', 'Minyak Goreng Uji', 0.50, 'tier_3')
      ON CONFLICT (app_id, item_code) DO UPDATE SET default_weight = EXCLUDED.default_weight
      RETURNING item_id;
    `);
    testItemId = itemRes.rows[0].item_id;
  });

  afterAll(async () => {
    // Bersihkan data uji dari partisi & tabel rollup
    await client.query("ALTER TABLE point_event DISABLE TRIGGER trg_immutable_header");
    await client.query("ALTER TABLE point_event_line DISABLE TRIGGER trg_immutable_line");
    await client.query("DELETE FROM point_event_line WHERE item_id = $1", [testItemId]);
    await client.query("DELETE FROM point_event WHERE idempotency_key LIKE 'test-fase1-%'");
    await client.query("ALTER TABLE point_event_line ENABLE TRIGGER trg_immutable_line");
    await client.query("ALTER TABLE point_event ENABLE TRIGGER trg_immutable_header");
    await client.query("DELETE FROM idempotency_registry WHERE idempotency_key LIKE 'test-fase1-%'");
    await client.query("DELETE FROM point_daily WHERE person_id = $1 AND date_key = '2026-11-13'", [testPersonId]);
    await client.query("DELETE FROM point_monthly WHERE person_id = $1 AND month_key = '2026-11'", [testPersonId]);
    await client.query("DELETE FROM dim_item WHERE item_code = 'E2E_TEST_ITEM_01'");
    await client.end();
  });

  it('1. Schema Integrity: Tabel ref_app dan point_config terisi seed default', async () => {
    const appRes = await client.query("SELECT app_id FROM ref_app ORDER BY app_id");
    const appIds = appRes.rows.map((r) => r.app_id);
    expect(appIds).toContain('mycheck');
    expect(appIds).toContain('stokis');
    expect(appIds).toContain('mycustomer');

    const configRes = await client.query("SELECT config_key, config_value FROM point_config WHERE config_key = 'daily_points_ceiling'");
    expect(Number(configRes.rows[0].config_value)).toBe(50.0);
  });

  it('2. Idempotency Registry: Menolak duplikasi idempotency_key', async () => {
    const testKey = 'test-fase1-idem-key-01';
    await client.query("DELETE FROM idempotency_registry WHERE idempotency_key = $1", [testKey]);

    const ins1 = await client.query(
      "INSERT INTO idempotency_registry (idempotency_key, event_id, app_id, response_payload) VALUES ($1, gen_random_uuid(), 'stokis', '{\"ok\":true}')",
      [testKey]
    );
    expect(ins1.rowCount).toBe(1);

    // Insert kedua dengan key sama wajib ditolak
    await expect(
      client.query(
        "INSERT INTO idempotency_registry (idempotency_key, event_id, app_id, response_payload) VALUES ($1, gen_random_uuid(), 'stokis', '{\"ok\":true}')",
        [testKey]
      )
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });

  it('3. Table Routing: Insert ke point_event dan point_event_line berhasil', async () => {
    const eventIdRes = await client.query(`
      INSERT INTO point_event (
        app_id, task_code, person_id, branch_id, shift_date, occurred_at, points, kind, session_ref, idempotency_key
      ) VALUES (
        'stokis', 'STOKIS_OPNAME', $1, $2, '2026-11-13', '2026-11-13T10:00:00+07:00', 3.00, 'earn', 'SESI_F1_01', 'test-fase1-event-01'
      ) RETURNING event_id;
    `, [testPersonId, testBranchId]);

    const eventId = eventIdRes.rows[0].event_id;
    expect(eventId).toBeDefined();

    // Insert line item
    const lineRes = await client.query(`
      INSERT INTO point_event_line (
        event_id, shift_date, item_id, qty, weight_snapshot, points
      ) VALUES (
        $1, '2026-11-13', $2, 6.00, 0.50, 3.00
      ) RETURNING line_id;
    `, [eventId, testItemId]);

    expect(lineRes.rows[0].line_id).toBeDefined();

    // Verifikasi data berhasil tersimpan di point_event
    const partCheck = await client.query("SELECT points FROM point_event WHERE event_id = $1", [eventId]);
    expect(partCheck.rows.length).toBe(1);
    expect(Number(partCheck.rows[0].points)).toBe(3.0);
  });

  it('4. Append-Only Enforcement: UPDATE dan DELETE pada point_event & line dilarang oleh trigger', async () => {
    // Coba UPDATE pada point_event
    await expect(
      client.query("UPDATE point_event SET points = 99.00 WHERE idempotency_key = 'test-fase1-event-01'")
    ).rejects.toThrow(/Operasi UPDATE dan DELETE dilarang/);

    // Coba DELETE pada point_event_line
    await expect(
      client.query("DELETE FROM point_event_line WHERE shift_date = '2026-11-13' AND item_id = $1", [testItemId])
    ).rejects.toThrow(/Operasi UPDATE dan DELETE dilarang/);
  });

  it('5. Constraint Integrity: Validasi qty > 0 dan enum kind', async () => {
    // Qty negatif harus ditolak
    await expect(
      client.query(`
        INSERT INTO point_event_line (event_id, shift_date, item_id, qty, weight_snapshot, points)
        VALUES (gen_random_uuid(), '2026-11-13', $1, -1.0, 0.50, -0.50)
      `, [testItemId])
    ).rejects.toThrow(/violates check constraint/);

    // Kind di luar ('earn', 'reversal', 'adjustment') harus ditolak
    await expect(
      client.query(`
        INSERT INTO point_event (
          app_id, task_code, person_id, branch_id, shift_date, occurred_at, points, kind, idempotency_key
        ) VALUES (
          'stokis', 'STOKIS_OPNAME', $1, $2, '2026-11-13', now(), 1.0, 'invalid_kind', 'test-fase1-bad-kind'
        )
      `, [testPersonId, testBranchId])
    ).rejects.toThrow(/violates check constraint/);
  });

  it('6. Table Performance: B-Tree Indexes aktif pada point_event & point_event_line', async () => {
    const idxRes = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'point_event'");
    expect(idxRes.rows.some((r) => r.indexname.includes('lookup') || r.indexname.includes('shift_date'))).toBe(true);
  });

  it('7. Idempotent Rollup: refresh_point_daily dan refresh_point_monthly mengagregasi baris mentah secara akurat', async () => {
    // Bersihkan dulu event uji hari ini agar terisolasi murni
    await client.query("ALTER TABLE point_event DISABLE TRIGGER trg_immutable_header");
    await client.query("ALTER TABLE point_event_line DISABLE TRIGGER trg_immutable_line");
    await client.query("DELETE FROM point_event_line WHERE shift_date = '2026-11-13'");
    await client.query("DELETE FROM point_event WHERE shift_date = '2026-11-13' AND person_id = $1", [testPersonId]);
    await client.query("ALTER TABLE point_event_line ENABLE TRIGGER trg_immutable_line");
    await client.query("ALTER TABLE point_event ENABLE TRIGGER trg_immutable_header");
    // Insert 2 event: 4.00 pt (Stokis) + 6.00 pt (MyCheck) = 10.00 pt
    await client.query(`
      INSERT INTO point_event (app_id, task_code, person_id, branch_id, shift_date, occurred_at, points, kind, idempotency_key)
      VALUES 
        ('stokis', 'STOKIS_OPNAME', $1, $2, '2026-11-13', now(), 4.00, 'earn', 'test-fase1-agg-01'),
        ('mycheck', 'MYCHECK_SHIFT_CLOSE', $1, $2, '2026-11-13', now(), 6.00, 'earn', 'test-fase1-agg-02');
    `, [testPersonId, testBranchId]);

    // Jalankan rollup harian
    await client.query("SELECT refresh_point_daily('2026-11-13')");

    // Periksa point_daily: stokis = 4.00, mycheck = 6.00
    const dailyRes = await client.query(
      "SELECT app_id, total_points, event_count, is_capped FROM point_daily WHERE person_id = $1 AND date_key = '2026-11-13' ORDER BY app_id",
      [testPersonId]
    );

    expect(dailyRes.rows.length).toBe(2);
    const stokisRow = dailyRes.rows.find((r) => r.app_id === 'stokis');
    const mycheckRow = dailyRes.rows.find((r) => r.app_id === 'mycheck');
    expect(Number(stokisRow.total_points)).toBe(4.00);
    expect(Number(mycheckRow.total_points)).toBe(6.00);
    expect(stokisRow.is_capped).toBe(false);

    // Jalankan rollup bulanan
    await client.query("SELECT refresh_point_monthly('2026-11')");

    const monthlyRes = await client.query(
      "SELECT app_id, total_points FROM point_monthly WHERE person_id = $1 AND month_key = '2026-11' AND app_id IN ('stokis', 'mycheck') ORDER BY app_id",
      [testPersonId]
    );

    const mStokis = monthlyRes.rows.find((r) => r.app_id === 'stokis');
    const mCheck = monthlyRes.rows.find((r) => r.app_id === 'mycheck');
    expect(Number(mStokis.total_points)).toBe(4.00);
    expect(Number(mCheck.total_points)).toBe(6.00);

    // Uji plafon harian 50 pt: Tambahkan 50 pt lagi (total 60 pt)
    await client.query(`
      INSERT INTO point_event (app_id, task_code, person_id, branch_id, shift_date, occurred_at, points, kind, idempotency_key)
      VALUES ('stokis', 'STOKIS_OPNAME', $1, $2, '2026-11-13', now(), 50.00, 'earn', 'test-fase1-agg-03');
    `, [testPersonId, testBranchId]);

    // Rollup ulang
    await client.query("SELECT refresh_point_daily('2026-11-13')");

    const cappedDaily = await client.query(
      "SELECT total_points, is_capped FROM point_daily WHERE person_id = $1 AND date_key = '2026-11-13'",
      [testPersonId]
    );

    // Total semua app harus dipotong ke plafon 50.00 pt dan ditandai is_capped = true
    const totalDayPoints = cappedDaily.rows.reduce((s, r) => s + Number(r.total_points), 0);
    expect(totalDayPoints).toBe(50.00);
    expect(cappedDaily.rows.every((r) => r.is_capped)).toBe(true);

    // Cleanup baris uji
    await client.query("ALTER TABLE point_event DISABLE TRIGGER trg_immutable_header");
    await client.query("DELETE FROM point_event WHERE idempotency_key LIKE 'test-fase1-agg-%'");
    await client.query("ALTER TABLE point_event ENABLE TRIGGER trg_immutable_header");
  });
});
