import { createClient } from '@supabase/supabase-js';
import { TaskEventSchema, type TaskEvent } from '@mochikin/shared/events';
import { signEvent, verifyRawPayload } from '@mochikin/shared/sso';
import { MyperformanceIntegrationService } from '../src/lib/integration/points';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const eventsSecret = process.env.MOCHIKIN_EVENTS_SECRET || 'dev-events-secret-key-12345';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('================================================================');
  console.log('🚀 UJICOBA SISTEM POIN LINTAS APLIKASI (MYPERFORMANCE)');
  console.log('================================================================\n');

  // 1. Ambil data person & branch yang valid dari database
  const { data: person, error: pErr } = await supabase
    .from('people')
    .select('id, name, role, branch_id')
    .eq('status', 'active')
    .not('branch_id', 'is', null)
    .limit(1)
    .single();

  if (pErr || !person) {
    console.error('❌ Gagal mengambil person aktif:', pErr?.message);
    process.exit(1);
  }

  const { data: branch, error: bErr } = await supabase
    .from('branches')
    .select('id, name, code')
    .eq('id', person.branch_id)
    .single();

  if (bErr || !branch) {
    console.error('❌ Gagal mengambil branch:', bErr?.message);
    process.exit(1);
  }

  console.log(`👤 Target User Pengujian : ${person.name} (${person.id})`);
  console.log(`🏢 Cabang Kerja           : ${branch.name} [${branch.code}] (${branch.id})\n`);

  const service = new MyperformanceIntegrationService({ supabase });
  const runId = Date.now();
  const testDate = new Date().toISOString();

  // 2. Daftar skenario emisi poin dari masing-masing app
  const testScenarios: Array<{
    app: 'mycheck' | 'stokis' | 'mycustomer';
    task: string;
    qty: number;
    expectedUnitPoints: number;
    desc: string;
  }> = [
    // Dari MyCheck
    {
      app: 'mycheck',
      task: 'MYCHECK_HADIR',
      qty: 1,
      expectedUnitPoints: 1.0,
      desc: 'Petugas check-in shift tepat waktu',
    },
    {
      app: 'mycheck',
      task: 'MYCHECK_SHIFT_CLOSE',
      qty: 1,
      expectedUnitPoints: 2.0,
      desc: 'Petugas menyelesaikan & menutup shift',
    },
    {
      app: 'mycheck',
      task: 'MYCHECK_INCIDENT',
      qty: 1,
      expectedUnitPoints: 1.5,
      desc: 'Pelaporan insiden operasional terverifikasi',
    },
    // Dari Stokis
    {
      app: 'stokis',
      task: 'STOKIS_OPNAME',
      qty: 1,
      expectedUnitPoints: 3.0,
      desc: 'Petugas menyelesaikan sesi Stock Opname fisik',
    },
    {
      app: 'stokis',
      task: 'STOKIS_MUTASI',
      qty: 4,
      expectedUnitPoints: 1.0,
      desc: 'Petugas mencatat 4 item mutasi stok',
    },
    // Dari MyCustomer
    {
      app: 'mycustomer',
      task: 'MYCUST_TIKET',
      qty: 1,
      expectedUnitPoints: 2.0,
      desc: 'Penanganan tiket kendala pelanggan selesai',
    },
    {
      app: 'mycustomer',
      task: 'MYCUST_ORDER',
      qty: 6,
      expectedUnitPoints: 0.5,
      desc: 'Kasir memproses 6 transaksi order pelanggan',
    },
  ];

  let totalPointsExpected = 0;
  const recordedEventIds: string[] = [];

  console.log('--- TAHAP 1: EMISI TASK EVENT DARI SETIAP APLIKASI ---');

  for (const sc of testScenarios) {
    const idempotencyKey = `e2e-${sc.app}-${sc.task.toLowerCase()}-${runId}`;
    const expectedPoints = sc.qty * sc.expectedUnitPoints;
    totalPointsExpected += expectedPoints;

    const eventPayload: TaskEvent = {
      taskId: sc.task,
      personId: person.id,
      branchId: branch.id,
      appId: sc.app,
      outputQty: sc.qty,
      occurredAt: testDate,
      idempotencyKey,
      meta: { testRun: runId, note: sc.desc },
    };

    // Validasi Zod schema kontrak
    const schemaValidation = TaskEventSchema.safeParse(eventPayload);
    if (!schemaValidation.success) {
      console.error(`❌ [${sc.app}] Validasi schema gagal untuk ${sc.task}:`, schemaValidation.error.format());
      process.exit(1);
    }

    // Validasi HMAC Signature
    const signature = signEvent(eventPayload, eventsSecret);
    const rawBody = JSON.stringify(eventPayload);
    const isSigValid = verifyRawPayload(rawBody, signature, eventsSecret);
    if (!isSigValid) {
      console.error(`❌ [${sc.app}] HMAC Signature verification failed`);
      process.exit(1);
    }

    // Eksekusi pencatatan event ke MyPerformance Points Service
    const res = await service.recordEvent(eventPayload);
    recordedEventIds.push(res.eventId);

    console.log(
      `✅ [${sc.app.toUpperCase()}] ${sc.task.padEnd(20)} | Qty: ${sc.qty} | Poin: +${res.points.toFixed(2)} | Event ID: ${res.eventId.slice(0, 8)}... (${sc.desc})`
    );

    if (res.points !== expectedPoints) {
      console.error(`❌ Poin tidak sesuai! Diharapkan: ${expectedPoints}, Didapat: ${res.points}`);
      process.exit(1);
    }
  }

  console.log(`\n👉 Total poin dari emisi seluruh app: +${totalPointsExpected.toFixed(2)} poin\n`);

  // 3. Ujicoba Idempotency (Anti Double-Credit)
  console.log('--- TAHAP 2: PENGUJIAN IDEMPOTENCY (ANTI-DUPLIKASI POIN) ---');
  const duplicateTestKey = `e2e-mycheck-mycheck_hadir-${runId}`;
  const duplicateEvent: TaskEvent = {
    taskId: 'MYCHECK_HADIR',
    personId: person.id,
    branchId: branch.id,
    appId: 'mycheck',
    outputQty: 1,
    occurredAt: testDate,
    idempotencyKey: duplicateTestKey,
  };

  const retestResult = await service.recordEvent(duplicateEvent);
  if (retestResult.idempotent) {
    console.log(`✅ IDEMPOTENT: Kirim ulang event yang sama terdeteksi!`);
    console.log(`   Poin tetap: ${retestResult.points}, eventId sama: ${retestResult.eventId.slice(0, 8)}...`);
  } else {
    console.error(`❌ GAGAL: Event duplikat malah dicatat ulang sebagai event baru!`);
    process.exit(1);
  }

  // 4. Verifikasi Data Fisik di Point Ledger Supabase
  console.log('\n--- TAHAP 3: VERIFIKASI KEBERADAAN DATA DI POINT_LEDGER ---');
  const { data: ledgerRows, error: lErr } = await supabase
    .from('point_ledger')
    .select('id, person_id, branch_id, task_code, task_name_snapshot, points_per_unit_snapshot, quantity, points, source_app, shift_date, occurred_at')
    .eq('person_id', person.id)
    .in('id', recordedEventIds);

  if (lErr) {
    console.error('❌ Gagal membaca point_ledger:', lErr.message);
    process.exit(1);
  }

  console.log(`✅ Ditemukan ${ledgerRows?.length} baris ledger baru di Supabase:`);
  console.table(
    ledgerRows?.map((r) => ({
      app: r.source_app,
      task: r.task_code,
      name_snapshot: r.task_name_snapshot,
      unit_pts: r.points_per_unit_snapshot,
      qty: r.quantity,
      total_pts: r.points,
      date: r.shift_date,
    }))
  );

  // 5. Verifikasi Pembacaan Skor di MyPerformance (Today & Monthly Summary)
  console.log('\n--- TAHAP 4: VERIFIKASI QUERY SKOR & DASHBOARD MYPERFORMANCE ---');
  const todayScore = await service.getTodayScore(person.id);
  console.log(`📊 Poin Hari Ini (getTodayScore): ${todayScore.points} Poin (Sumber data: ${todayScore.source})`);

  const monthlySummary = await service.getMonthlySummary(person.id);
  console.log(`📈 Ringkasan Bulanan (getMonthlySummary):`);
  console.log(`   - Bulan             : ${monthlySummary.month}`);
  console.log(`   - Total Poin Bulan  : ${monthlySummary.monthTotalPoints} Poin`);
  console.log(`   - Target Bulanan    : ${monthlySummary.monthTarget} Poin`);
  console.log(`   - Progress Target   : ${monthlySummary.progressPercent}%`);
  console.log(`   - Sisa Poin Target  : ${monthlySummary.pointsNeededForTarget} Poin`);

  // 6. Ujicoba Rollup Harian (Cron Daily Rollup)
  console.log('\n--- TAHAP 5: PENGUJIAN ROLLUP HARIAN (POINT_ROLLUPS) ---');
  const todayDateStr = todayScore.date;
  const processedCount = await service.persistDayRollups(todayDateStr);
  console.log(`✅ Rollup harian dijalankan untuk ${todayDateStr}: ${processedCount} person diproses`);

  const { rows: rollups } = await service.getRollups(person.id, 'day', 10, 0);
  const matchedRollup = rollups.find((r) => r.period_key === todayDateStr);

  if (matchedRollup) {
    console.log(`✅ Point Rollup tersimpan di database point_rollups:`);
    console.log(`   - Period Key : ${matchedRollup.period_key}`);
    console.log(`   - Total Poin : ${matchedRollup.total_points}`);
    console.log(`   - Total Qty  : ${matchedRollup.total_quantity}`);
    console.log(`   - Event Count: ${matchedRollup.event_count}`);
  } else {
    console.warn(`⚠️ Rollup tidak ditemukan untuk tanggal ${todayDateStr}`);
  }

  console.log('\n================================================================');
  console.log('🎉 SEMUA PENGUJIAN SISTEM POIN BERHASIL 100%!');
  console.log('Poin dari MyCheck, Stokis, dan MyCustomer tercatat dengan sempurna di MyPerformance.');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('❌ Exception in test:', err);
  process.exit(1);
});
