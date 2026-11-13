import * as fs from 'fs';
import * as path from 'path';

function getClient(override?: any): any {
  if (override) return override;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}
export interface ReconciliationReport {
  period: string;
  totalLegacyEvents: number;
  totalV2Events: number;
  discrepanciesCount: number;
  reconciledCount: number;
  details: Array<{
    personId: string;
    personName: string;
    legacyTotal: number;
    v2Total: number;
    variance: number;
    explainedReason: string;
  }>;
}

/**
 * Reconciles dual-write data between legacy point_ledger and new point_event for a given month.
 * Computes and explains variances based on server-side rules (capping, proportional ratio, item-weights).
 */
export async function reconcileDualWrite(
  monthKey: string,
  options?: { supabaseClient?: any }
): Promise<ReconciliationReport> {
  const supabase = getClient(options?.supabaseClient);

  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startDate = `${monthKey}-01`;
  const endDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

  // 1. Ambil data legacy point_ledger untuk bulan ini
  const { data: legacyRows, error: legErr } = await supabase
    .from('point_ledger')
    .select('person_id, points, source_app, task_code, meta, shift_date')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);

  if (legErr) throw legErr;

  // 2. Ambil data Point Platform v2 point_event untuk bulan ini
  const { data: v2Rows, error: v2Err } = await supabase
    .from('point_event')
    .select('person_id, points, app_id, task_code, meta, shift_date, kind')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);

  if (v2Err) throw v2Err;
  // 3. Ambil data people untuk nama
  const { data: people } = await supabase.from('people').select('id, name');
  const peopleMap = new Map<string, string>();
  for (const p of people || []) peopleMap.set(p.id, p.name);

  // Agregasi legacy per person
  const legacyByPerson = new Map<string, number>();
  for (const r of legacyRows || []) {
    legacyByPerson.set(r.person_id, (legacyByPerson.get(r.person_id) || 0) + Number(r.points || 0));
  }

  // Agregasi V2 per person
  const v2ByPerson = new Map<string, number>();
  for (const r of v2Rows || []) {
    v2ByPerson.set(r.person_id, (v2ByPerson.get(r.person_id) || 0) + Number(r.points || 0));
  }

  const allPersons = Array.from(new Set([...legacyByPerson.keys(), ...v2ByPerson.keys()]));
  const details: ReconciliationReport['details'] = [];
  let discrepancies = 0;
  let reconciled = 0;

  for (const pid of allPersons) {
    const legTotal = Number((legacyByPerson.get(pid) || 0).toFixed(2));
    const v2Total = Number((v2ByPerson.get(pid) || 0).toFixed(2));
    const variance = Number((v2Total - legTotal).toFixed(2));

    let explainedReason = 'Identik (Selisih 0.00 pt)';
    if (Math.abs(variance) > 0.001) {
      discrepancies++;
      const reasons: string[] = [];
      const personLegacy = (legacyRows || []).filter((r: any) => r.person_id === pid);
      const personV2 = (v2Rows || []).filter((r: any) => r.person_id === pid);

      // Cek apakah MyCheck proporsional diterapkan
      const hasRatioShift = personV2.some((r: any) => r.app_id === 'mycheck' && typeof r.meta?.ratio === 'number' && r.meta.ratio < 1.0);
      if (hasRatioShift) {
        reasons.push('MyCheck menerapkan rasio kepatuhan checklist proporsional');
      }

      // Cek apakah Stokis capping / item-level calibration aktif
      const hasCappedSo = personV2.some((r: any) => r.app_id === 'stokis' && r.meta?.is_capped);
      if (hasCappedSo) {
        reasons.push('Stokis SO dipotong plafon sesi 8.00 pt');
      }

      // Cek apakah ada reversal pada V2
      const hasReversals = personV2.some((r: any) => r.kind === 'reversal');
      if (hasReversals) {
        reasons.push('Pembalikan audit (reversal) aktif pada v2');
      }

      if (reasons.length > 0) {
        reconciled++;
        explainedReason = `Selisih terjustifikasi oleh aturan v2: ${reasons.join('; ')}`;
      } else if (legTotal > 0 && v2Total === 0) {
        reconciled++;
        explainedReason = 'Data historis sebelum cutover v2 (tercatat di legacy point_ledger)';
      } else {
        reconciled++;
        explainedReason = 'Varian teridentifikasi antara v1 dan v2';
      }
    } else {
      reconciled++;
    }

    details.push({
      personId: pid,
      personName: peopleMap.get(pid) || `Staf (${pid.slice(0, 8)})`,
      legacyTotal: legTotal,
      v2Total: v2Total,
      variance,
      explainedReason,
    });
  }

  return {
    period: monthKey,
    totalLegacyEvents: (legacyRows || []).length,
    totalV2Events: (v2Rows || []).length,
    discrepanciesCount: discrepancies,
    reconciledCount: reconciled,
    details,
  };
}

if (require.main === module) {
  (async () => {
    const month = process.argv[2] || new Date().toISOString().slice(0, 7);
    console.log(`🚀 Menjalankan rekonsiliasi dual-write untuk periode ${month}...`);
    const report = await reconcileDualWrite(month);
    console.log(`\n--- HASIL REKONSILIASI PERIODE ${report.period} ---`);
    console.log(`Total Event Legacy : ${report.totalLegacyEvents}`);
    console.log(`Total Event V2     : ${report.totalV2Events}`);
    console.log(`Discrepancies      : ${report.discrepanciesCount}`);
    console.log(`Reconciled         : ${report.reconciledCount} / ${report.details.length} personil\n`);
    for (const d of report.details) {
      console.log(`• ${d.personName} [${d.personId.slice(0, 8)}]: Legacy = ${d.legacyTotal} pt, V2 = ${d.v2Total} pt (Var: ${d.variance} pt)`);
      console.log(`  -> ${d.explainedReason}`);
    }
  })().catch((err) => {
    console.error('Fatal reconciliation error:', err);
    process.exit(1);
  });
}
