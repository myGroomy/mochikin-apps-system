import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GET as keepaliveHandler } from '../src/app/api/cron/keepalive/route';
import { GET as healthHandler } from '../src/app/api/points/health/route';
import { GET as archiveMonthlyHandler } from '../src/app/api/cron/archive-monthly/route';
import { getSupabaseAdmin } from '../src/lib/supabase';
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

describe('FASE 4: Operasional Free Tier (Keepalive, Backup/Restore, & Monitoring)', () => {
  beforeAll(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jjugzkpqgfvlgerfapnl.supabase.co';
    }
  });

  it('1. Keepalive Terjadwal: Memverifikasi konektivitas Supabase & respon cepat', async () => {
    const req = new Request('http://localhost:3004/api/cron/keepalive');
    const res = await keepaliveHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('active');
    expect(json.database).toBe('connected');
    expect(json.latency_ms).toBeGreaterThanOrEqual(0);
    expect(json.timestamp_wib).toBeDefined();
    expect(json.message).toContain('keepalive ping successful');
  });

  it('2. Endpoint Monitoring Kapasitas: Menghitung ukuran DB & sisa kapasitas terhadap plafon 250 MB', async () => {
    const res = await healthHandler();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('healthy');
    expect(json.storage).toBeDefined();
    expect(json.storage.target_max_mb).toBe(250);
    expect(json.storage.free_tier_cap_mb).toBe(500);
    expect(json.storage.warning_threshold_mb).toBe(150);
    expect(Number(json.storage.size_mb)).toBeLessThan(150); // DB ~18 MB
    expect(json.warning.active).toBe(false);
    expect(json.warning.message).toContain('Normal');
    expect(json.table_rows).toBeDefined();
    expect(json.table_rows.ref_app).toBeGreaterThanOrEqual(3);
    expect(json.table_rows.point_config).toBeGreaterThanOrEqual(9);
  });

  it('3. Job Arsip Bulanan (Dry-Run Mode): Memverifikasi kepatuhan kebijakan penundaan jika DB < 150 MB', async () => {
    // Mode dry-run: true
    const dryRunReq = new Request('http://localhost:3004/api/cron/archive-monthly?dryRun=true&olderThanMonths=18');
    const dryRes = await archiveMonthlyHandler(dryRunReq);
    expect(dryRes.status).toBe(200);

    const dryJson = await dryRes.json();
    expect(dryJson.success).toBe(true);
    expect(dryJson.mode).toBe('dry_run');
    expect(dryJson.action_taken).toBe('DRY_RUN_ONLY');
    expect(dryJson.cutoff_month).toBeDefined();

    // Mode dry-run: false
    const execReq = new Request('http://localhost:3004/api/cron/archive-monthly?dryRun=false&olderThanMonths=18');
    const execRes = await archiveMonthlyHandler(execReq);
    expect(execRes.status).toBe(200);

    const execJson = await execRes.json();
    expect(execJson.success).toBe(true);
    expect(execJson.mode).toBe('execute');
    // Karena DB < 150 MB, aksi WAJIB berstatus 'DEFERRED_DB_UNDER_150MB'
    expect(execJson.action_taken).toBe('DEFERRED_DB_UNDER_150MB');
    expect(execJson.policy_decision).toContain('di bawah ambang batas 150 MB');
  });

  it('4. Backup & Restore Otomasi: Integritas Checksum SHA-256 & Uji Restore Berhasil 100%', async () => {
    const tempBackupDir = path.resolve(__dirname, '../../../backups/test-temp');
    if (!fs.existsSync(tempBackupDir)) {
      fs.mkdirSync(tempBackupDir, { recursive: true });
    }

    try {
      // 1. Eksekusi Backup
      const backupResult = await createPointPlatformBackup({ outputDir: tempBackupDir, supabaseClient: getSupabaseAdmin() });
      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
      expect(backupResult.checksum).toBeDefined();
      expect(backupResult.checksum.length).toBe(64); // SHA-256 hex string

      // Baca isi backup
      const backupContent = fs.readFileSync(backupResult.backupPath, 'utf8');
      const backupPayload: PlatformBackupData = JSON.parse(backupContent);
      expect(backupPayload.tables.ref_app.length).toBeGreaterThanOrEqual(3);
      expect(backupPayload.tables.point_config.length).toBeGreaterThanOrEqual(9);

      // 2. Eksekusi Restore dari Payload yang Sah
      const restoreResult = await restorePointPlatform(backupPayload, { supabaseClient: getSupabaseAdmin() });
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.checksumValid).toBe(true);
      expect(restoreResult.restoredCounts.ref_app).toBeGreaterThanOrEqual(3);
      expect(restoreResult.restoredCounts.point_config).toBeGreaterThanOrEqual(9);

      // 3. Uji Keamanan: Data termodifikasi (tampered payload) WAJIB ditolak oleh validasi checksum
      const tamperedPayload: PlatformBackupData = {
        ...backupPayload,
        tables: {
          ...backupPayload.tables,
          point_config: [{ config_key: 'hacked_key', config_value: 9999 }],
        },
      };

      await expect(restorePointPlatform(tamperedPayload, { supabaseClient: getSupabaseAdmin() })).rejects.toThrow(/Integritas backup gagal: SHA-256 checksum tidak cocok/);
    } finally {
      // Bersihkan folder temp
      if (fs.existsSync(tempBackupDir)) {
        fs.rmSync(tempBackupDir, { recursive: true, force: true });
      }
    }
  });
});
