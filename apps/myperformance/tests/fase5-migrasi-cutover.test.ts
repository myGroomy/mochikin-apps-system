import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mapLauncherRoleToJwtRole } from '@mochikin/shared/sso';
import { toDeterministicUuid, isUuid } from '../../../apps/mycheck/lib/resolve-person';
import { reconcileDualWrite } from '../../../scripts/reconcile-dual-write';
import { pointsService } from '../src/lib/integration/points';
import { getSupabaseAdmin } from '../src/lib/supabase';

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

describe('FASE 5: Migrasi & Cutover (F-07, F-10, Dual-Write Rekonsiliasi, & Rollback)', () => {
  let testPersonId: string;
  const supabase = getSupabaseAdmin();

  beforeAll(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jjugzkpqgfvlgerfapnl.supabase.co';
    }
    const { data: p } = await supabase.from('people').select('id').eq('status', 'active').limit(1).single();
    testPersonId = p?.id || '00000000-0000-0000-0000-000000000001';
  });

  it('1. F-10: mapLauncherRoleToJwtRole memetakan role staff ke role_staff (bukan petugas)', () => {
    expect(mapLauncherRoleToJwtRole('staff')).toBe('role_staff');
    expect(mapLauncherRoleToJwtRole('Staff')).toBe('role_staff');
    expect(mapLauncherRoleToJwtRole('branch_manager')).toBe('role_manager');
    expect(mapLauncherRoleToJwtRole('super_admin')).toBe('super_admin');
    expect(mapLauncherRoleToJwtRole('role_admin')).toBe('role_admin');
    expect(mapLauncherRoleToJwtRole('captain')).toBe('role_captain');
  });

  it('2. F-07: toDeterministicUuid mengubah format ULID/string MyCheck menjadi valid UUID v4', () => {
    const ulidReport = '01M6KZQED2RJW0ZPSYC4X25YST';
    const uuid = toDeterministicUuid('mycheck-report', ulidReport);

    expect(isUuid(uuid)).toBe(true);
    // Idempoten: input yang sama menghasilkan UUID yang sama persis
    expect(toDeterministicUuid('mycheck-report', ulidReport)).toBe(uuid);

    // Jika sudah UUID, tidak diubah
    const existingUuid = '3b2773c8-6dd1-4c1c-bb77-31150563eed4';
    expect(toDeterministicUuid('test', existingUuid)).toBe(existingUuid);
  });

  it('3. F-08 & F-09: Parameter bisnis insiden dan WA limit terdaftar di point_config', async () => {
    const { data: configs } = await supabase
      .from('point_config')
      .select('config_key, config_value')
      .in('config_key', ['incident_reward_points', 'incident_max_daily_reward', 'mycustomer_wa_daily_limit']);

    const map = new Map((configs || []).map((c: any) => [c.config_key, Number(c.config_value)]));
    expect(map.get('incident_reward_points')).toBe(1.50);
    expect(map.get('incident_max_daily_reward')).toBe(3.00);
    expect(map.get('mycustomer_wa_daily_limit')).toBe(15.00);
  });

  it('4. Dual-Write Rekonsiliasi: Membandingkan data legacy vs v2 dan menjustifikasi varian', async () => {
    const month = new Date().toISOString().slice(0, 7);
    const report = await reconcileDualWrite(month, { supabaseClient: supabase });

    expect(report.period).toBe(month);
    expect(report.totalLegacyEvents).toBeGreaterThanOrEqual(0);
    expect(report.reconciledCount).toBe(report.details.length);
    // Seluruh variansi terjelaskan oleh aturan server-side v2
    expect(report.details.every((d) => d.explainedReason.length > 0)).toBe(true);
  });

  it('5. Rencana Rollback Teruji: Beralih instan antara v2 dan v1 lewat feature flag USE_POINT_PLATFORM_V2', async () => {
    // Mode Cutover V2: membaca point_daily
    process.env.USE_POINT_PLATFORM_V2 = 'true';
    const summaryV2 = await pointsService.getMonthlySummary(testPersonId);
    expect(summaryV2.month).toBeDefined();

    // Mode Rollback V1: seketika kembali membaca legacy point_ledger tanpa error
    process.env.USE_POINT_PLATFORM_V2 = 'false';
    const summaryV1 = await pointsService.getMonthlySummary(testPersonId);
    expect(summaryV1.month).toBeDefined();

    // Kembalikan ke V2 sebagai default cutover
    process.env.USE_POINT_PLATFORM_V2 = 'true';
  });
});
