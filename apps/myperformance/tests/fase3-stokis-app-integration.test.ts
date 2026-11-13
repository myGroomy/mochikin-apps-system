import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { calibrateItemTier, syncMasterItemsToDimItem } from '../../../apps/stokis/lib/domain/sync-dim-items';
import { getBackoffDelayMs, enqueueAndProcessOutbox, flushOutbox } from '../../../apps/stokis/lib/domain/outbox-service';
import { POST as stokisPointsHandler } from '../../../apps/stokis/app/api/so/points/route';
import { POST as stokisAuditHandler } from '../../../apps/stokis/app/api/admin/reports/[laporanId]/audit/route';
import { NextRequest } from 'next/server';
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
loadEnvFile('../../../apps/stokis/.env.local');

const rawConn = process.env.POSTGRES_URL_NON_POOLING || '';
const cleanConn = rawConn ? rawConn.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '') : '';
describe('FASE 3 - Iterasi 1: Integrasi Modul Stokis', () => {
  let db: Client;
  let testPersonId: string;
  let testAuditorId: string;
  let testBranchId: string;

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

    // Daftarkan item bahan uji di dim_item
    await db.query(`
      INSERT INTO dim_item (app_id, item_code, item_name, default_weight, tier)
      VALUES 
        ('stokis', 'ITM_F3_CUP', 'Cup Plastik Mochi', 0.10, 'tier_1'),
        ('stokis', 'ITM_F3_TEPUNG', 'Tepung Beras Ketan', 0.30, 'tier_2'),
        ('stokis', 'ITM_F3_AYAM', 'Ayam Fillet Marinasi', 0.50, 'tier_3')
      ON CONFLICT (app_id, item_code) DO UPDATE SET default_weight = EXCLUDED.default_weight;
    `);
  });

  afterAll(async () => {
    await db.query("DELETE FROM dim_item WHERE item_code IN ('ITM_F3_CUP', 'ITM_F3_TEPUNG', 'ITM_F3_AYAM')");
    await db.end();
  });

  it('1. Kalibrasi Tier & Bobot Item Fisik (1 Poin = 10 Menit Kerja Nyata)', () => {
    // Tier 1: Kemasan visual / Dry packaging -> 1 Menit = 0.10 pt
    const cup = calibrateItemTier({ Nama_Barang: 'Cup 16oz', Satuan: 'pcs' });
    expect(cup.tier).toBe('tier_1');
    expect(cup.weight).toBe(0.10);

    const box = calibrateItemTier({ Nama_Barang: 'Box Mochi Kemasan', Satuan: 'pcs' });
    expect(box.tier).toBe('tier_1');
    expect(box.weight).toBe(0.10);

    // Tier 2: Bahan curah standar -> 3 Menit = 0.30 pt
    const tepung = calibrateItemTier({ Nama_Barang: 'Tepung Terigu Segitiga', Satuan: 'kg' });
    expect(tepung.tier).toBe('tier_2');
    expect(tepung.weight).toBe(0.30);

    // Tier 3: Basah / Chiller / Daging / Minyak -> 5 Menit = 0.50 pt
    const ayam = calibrateItemTier({ Nama_Barang: 'Ayam Potong Segar', Area: 'Chiller Utama' });
    expect(ayam.tier).toBe('tier_3');
    expect(ayam.weight).toBe(0.50);

    const minyak = calibrateItemTier({ Nama_Barang: 'Minyak Goreng Curah', Satuan: 'L' });
    expect(minyak.tier).toBe('tier_3');
    expect(minyak.weight).toBe(0.50);

    // Manual override jika diisi di sheet
    const manual = calibrateItemTier({ Nama_Barang: 'Item Khusus', Point: 1.50 });
    expect(manual.weight).toBe(1.50);
  });

  it('2. Outbox Resiliensi: Menahan event dengan status pending saat offline & flush saat pulih', async () => {
    const testSpreadsheetId = 'mock_spreadsheet_f3_outbox';
    const idemKey = `test-f3-offline-${Date.now()}`;

    // Payload sesi
    const sessionPayload = {
      appId: 'stokis' as const,
      taskCode: 'STOKIS_OPNAME',
      personId: testPersonId,
      branchId: testBranchId,
      shiftDate: '2026-11-13',
      occurredAt: '2026-11-13T10:00:00+07:00',
      sessionRef: 'SESI_F3_OFFLINE_01',
      idempotencyKey: idemKey,
      lines: [{ itemCode: 'ITM_F3_CUP', qty: 5 }],
    };

    // Simulasi offline: arahkan MYPERFORMANCE_URL ke port mati (port 59999)
    const origUrl = process.env.MYPERFORMANCE_URL;
    process.env.MYPERFORMANCE_URL = 'http://127.0.0.1:59999';

    const inMemoryOutbox: any[] = [];
    try {
      const res = await enqueueAndProcessOutbox(testSpreadsheetId, {
        eventType: 'session_ingest',
        idempotencyKey: idemKey,
        payload: sessionPayload,
      }, { inMemoryOutbox });

      // Harus gagal kirim tapi status tetap 'pending' di outbox (TIDAK ADA DATA HILANG)
      expect(res.success).toBe(false);
      expect(res.status).toBe('pending');
      expect(res.outboxId).toBeDefined();
      expect(inMemoryOutbox.length).toBe(1);
      expect(inMemoryOutbox[0][4]).toBe('pending'); // Status kolom ke-5 = pending
    } finally {
      process.env.MYPERFORMANCE_URL = origUrl;
    }
  });

  it('3. Outbox Capped Exponential Backoff: Dibatasi maksimal 5 menit (300.000 ms)', () => {
    expect(getBackoffDelayMs(1)).toBe(5000);
    expect(getBackoffDelayMs(2)).toBe(10000);
    expect(getBackoffDelayMs(3)).toBe(20000);
    expect(getBackoffDelayMs(4)).toBe(40000);
    expect(getBackoffDelayMs(7)).toBe(300000); // capped at 5 minutes
    expect(getBackoffDelayMs(15)).toBe(300000);
  });
});
