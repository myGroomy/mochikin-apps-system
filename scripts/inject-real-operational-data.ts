import { createClient } from '@supabase/supabase-js';
import { scryptSync, randomBytes } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jjugzkpqgfvlgerfapnl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdWd6a3BxZ2Z2bGdlcmZhcG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY1NjAzNywiZXhwIjoyMTA4MjMyMDM3fQ.HLrZdwSOd37V-1V7HVd7fLsI4AVcA9ROEqPyQAxi5M0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}$${hash}`;
}

const SYS_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🚀 Mulai proses injeksi data real 3 bulan operasional MOCHIKIN-APPS...');

  // ==========================================================================
  // 1. DUA CABANG: Bandung & Jakarta Selatan
  // ==========================================================================
  console.log('\n📍 [1/6] Menyiapkan 2 Cabang...');
  let branchBdgId = 'dbd72db3-9cb9-4879-982a-4f3deacbd144';
  const { data: existingBdg } = await supabase
    .from('branches')
    .select('id')
    .or('code.eq.CBG01BDG,code.eq.BDG')
    .maybeSingle();

  if (existingBdg?.id) {
    branchBdgId = existingBdg.id;
    await supabase.from('branches').update({
      name: 'Mochikin Bandung (Setiabudi)',
      code: 'CBG01BDG',
      city: 'Bandung',
      address: 'Jl. Dr. Setiabudi No. 88, Bandung',
      phone: '081223344550',
      status: 'active',
    }).eq('id', branchBdgId);
  } else {
    const { data: newBdg } = await supabase.from('branches').insert({
      id: branchBdgId,
      name: 'Mochikin Bandung (Setiabudi)',
      code: 'CBG01BDG',
      city: 'Bandung',
      address: 'Jl. Dr. Setiabudi No. 88, Bandung',
      phone: '081223344550',
      status: 'active',
      created_by: SYS_ID,
    }).select().single();
    if (newBdg) branchBdgId = newBdg.id;
  }

  let branchJktId: string;
  const { data: existingJkt } = await supabase
    .from('branches')
    .select('id')
    .or('code.eq.CBG02JKT,code.eq.JKT')
    .maybeSingle();

  if (existingJkt?.id) {
    branchJktId = existingJkt.id;
    await supabase.from('branches').update({
      name: 'Mochikin Jakarta (Tebet)',
      code: 'CBG02JKT',
      city: 'Jakarta Selatan',
      address: 'Jl. Tebet Raya No. 45, Jakarta Selatan',
      phone: '081234567890',
      status: 'active',
    }).eq('id', branchJktId);
  } else {
    const { data: newJkt, error: errJkt } = await supabase.from('branches').insert({
      name: 'Mochikin Jakarta (Tebet)',
      code: 'CBG02JKT',
      city: 'Jakarta Selatan',
      address: 'Jl. Tebet Raya No. 45, Jakarta Selatan',
      phone: '081234567890',
      status: 'active',
      created_by: SYS_ID,
    }).select().single();
    if (errJkt) throw new Error('Gagal buat cabang Jakarta: ' + errJkt.message);
    branchJktId = newJkt.id;
  }

  console.log(`  ✓ Cabang 1: Mochikin Bandung (${branchBdgId})`);
  console.log(`  ✓ Cabang 2: Mochikin Jakarta (${branchJktId})`);

  // ==========================================================================
  // 2. 5 USERS (1 Admin Existing 'dea' pass '778899', 4 generated)
  // ==========================================================================
  console.log('\n👥 [2/6] Menyiapkan 5 User Resmi...');

  const usersConfig = [
    {
      username: 'dea',
      name: 'Dea',
      email: 'dea@mochikin.id',
      phone: '081122334455',
      role: 'role_admin',
      pin: '778899',
      branch_id: branchBdgId,
    },
    {
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@mochikin.id',
      phone: '081299887711',
      role: 'branch_manager',
      pin: '123456',
      branch_id: branchBdgId,
    },
    {
      username: 'siti',
      name: 'Siti Rahma',
      email: 'siti@mochikin.id',
      phone: '081299887722',
      role: 'staff',
      pin: '123456',
      branch_id: branchBdgId,
    },
    {
      username: 'agus',
      name: 'Agus Pratama',
      email: 'agus@mochikin.id',
      phone: '081388776633',
      role: 'branch_manager',
      pin: '123456',
      branch_id: branchJktId,
    },
    {
      username: 'rina',
      name: 'Rina Wulandari',
      email: 'rina@mochikin.id',
      phone: '081388776644',
      role: 'staff',
      pin: '123456',
      branch_id: branchJktId,
    },
  ];

  const resolvedUsers = new Map<string, { id: string; username: string; name: string; role: string; branchId: string }>();

  for (const u of usersConfig) {
    const pinHash = hashPin(u.pin);
    const { data: existingUser } = await supabase
      .from('people')
      .select('id, username')
      .ilike('username', u.username)
      .maybeSingle();

    let userId: string;
    if (existingUser?.id) {
      userId = existingUser.id;
      await supabase.from('people').update({
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        branch_id: u.branch_id,
        pin_hash: pinHash,
        status: 'active',
        deleted_at: null,
      }).eq('id', userId);
    } else {
      const { data: newUser, error: errUser } = await supabase.from('people').insert({
        name: u.name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        role: u.role,
        branch_id: u.branch_id,
        pin_hash: pinHash,
        status: 'active',
        created_by: SYS_ID,
      }).select().single();
      if (errUser) throw new Error(`Gagal buat user ${u.username}: ${errUser.message}`);
      userId = newUser.id;
    }

    resolvedUsers.set(u.username, {
      id: userId,
      username: u.username,
      name: u.name,
      role: u.role,
      branchId: u.branch_id,
    });

    // Hubungkan juga ke branch_members
    await supabase.from('branch_members').upsert({
      branch_id: u.branch_id,
      person_id: userId,
      is_primary: true,
    }, { onConflict: 'branch_id,person_id' });

    console.log(`  ✓ User [${u.username}] - ${u.name} (${u.role}) -> Cabang: ${u.branch_id === branchBdgId ? 'Bandung' : 'Jakarta'}`);
  }

  // Khusus admin dea: daftarkan juga ke branch kedua agar memiliki akses kedua cabang
  const deaUser = resolvedUsers.get('dea')!;
  await supabase.from('branch_members').upsert({
    branch_id: branchJktId,
    person_id: deaUser.id,
    is_primary: false,
  }, { onConflict: 'branch_id,person_id' });

  // ==========================================================================
  // 3. TASK DEFINITIONS CATALOG
  // ==========================================================================
  console.log('\n📋 [3/6] Menyiapkan Katalog Task Definitions...');
  const taskCatalog = [
    { task_code: 'MYCHECK_HADIR', name: 'Hadir Tepat Waktu', app_id: 'mycheck', category: 'T', level_role: 'Staf', points_per_unit: 1.00, unit_output: 'shift', valid_from: '2026-01-01' },
    { task_code: 'MYCHECK_SHIFT_CLOSE', name: 'Tutup Shift', app_id: 'mycheck', category: 'T', level_role: 'SPV', points_per_unit: 2.00, unit_output: 'shift', valid_from: '2026-01-01' },
    { task_code: 'MYCHECK_INCIDENT', name: 'Laporan Insiden', app_id: 'mycheck', category: 'T', level_role: 'Staf', points_per_unit: 1.50, unit_output: 'laporan', valid_from: '2026-01-01' },
    { task_code: 'STOKIS_OPNAME', name: 'Opname Stok', app_id: 'stokis', category: 'T', level_role: 'Staf', points_per_unit: 3.00, unit_output: 'sesi', valid_from: '2026-01-01' },
    { task_code: 'STOKIS_MUTASI', name: 'Mutasi Barang', app_id: 'stokis', category: 'T', level_role: 'Staf', points_per_unit: 1.00, unit_output: 'item', valid_from: '2026-01-01' },
    { task_code: 'MYCUST_TIKET', name: 'Penanganan Tiket Pelanggan', app_id: 'mycustomer', category: 'T', level_role: 'Staf', points_per_unit: 2.00, unit_output: 'tiket', valid_from: '2026-01-01' },
    { task_code: 'MYCUST_ORDER', name: 'Proses Order', app_id: 'mycustomer', category: 'T', level_role: 'Staf', points_per_unit: 0.50, unit_output: 'order', valid_from: '2026-01-01' },
  ];

  for (const t of taskCatalog) {
    await supabase.from('task_definitions').upsert(t, { onConflict: 'task_code' });
  }
  console.log(`  ✓ ${taskCatalog.length} task definitions tersimpan.`);

  // ==========================================================================
  // 4. DATA OPERASIONAL 3 BULAN (15 Agustus 2026 - 12 November 2026 = ~90 hari)
  // ==========================================================================
  console.log('\n📅 [4/6] Meng-generate data operasional riil 90 hari (3 Bulan)...');

  // Bersihkan data lama agar bersih & idempotent
  await supabase.from('point_rollups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reports').delete().eq('app_id', 'stokis');

  const budi = resolvedUsers.get('budi')!;
  const siti = resolvedUsers.get('siti')!;
  const agus = resolvedUsers.get('agus')!;
  const rina = resolvedUsers.get('rina')!;
  const dea = resolvedUsers.get('dea')!;

  const ledgerRows: any[] = [];
  const reportsToInsert: any[] = [];
  const contributorsToInsert: any[] = [];
  const pointLogsToInsert: any[] = [];

  const startDate = new Date('2026-08-15T00:00:00Z');
  const endDate = new Date('2026-11-12T00:00:00Z');

  let dayIndex = 0;
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    dayIndex++;
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getUTCDay(); // 0 = Minggu

    // -------------------------------------------------------------
    // CABANG 1: BANDUNG (Budi = Manager, Siti = Staff)
    // -------------------------------------------------------------
    // Siti Hadir (kecuali hari libur bergantian tiap Senin)
    if (dayOfWeek !== 1) {
      ledgerRows.push({
        person_id: siti.id,
        branch_id: branchBdgId,
        task_code: 'MYCHECK_HADIR',
        task_name_snapshot: 'Hadir Tepat Waktu',
        points_per_unit_snapshot: 1.00,
        source_app: 'mycheck',
        event_id: `mycheck-hadir-siti-${dateStr}`,
        idempotency_key: `mycheck-hadir-siti-${dateStr}`,
        quantity: 1,
        points: 1.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T07:28:10.000+07:00`,
        meta: { shift: 'opening' },
      });

      // Siti input order pelanggan (8 - 18 order)
      const orderQty = 10 + (dayIndex % 7);
      ledgerRows.push({
        person_id: siti.id,
        branch_id: branchBdgId,
        task_code: 'MYCUST_ORDER',
        task_name_snapshot: 'Proses Order',
        points_per_unit_snapshot: 0.50,
        source_app: 'mycustomer',
        event_id: `mycust-order-siti-${dateStr}`,
        idempotency_key: `mycust-order-siti-${dateStr}`,
        quantity: orderQty,
        points: Number((orderQty * 0.50).toFixed(2)),
        shift_date: dateStr,
        occurred_at: `${dateStr}T14:15:22.000+07:00`,
        meta: { channel: 'pos_dine_in', totalOrders: orderQty },
      });
    }

    // Budi Hadir (kecuali hari libur tiap Selasa)
    if (dayOfWeek !== 2) {
      ledgerRows.push({
        person_id: budi.id,
        branch_id: branchBdgId,
        task_code: 'MYCHECK_HADIR',
        task_name_snapshot: 'Hadir Tepat Waktu',
        points_per_unit_snapshot: 1.00,
        source_app: 'mycheck',
        event_id: `mycheck-hadir-budi-${dateStr}`,
        idempotency_key: `mycheck-hadir-budi-${dateStr}`,
        quantity: 1,
        points: 1.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T07:42:05.000+07:00`,
        meta: { shift: 'opening' },
      });

      // Budi tutup shift sore
      ledgerRows.push({
        person_id: budi.id,
        branch_id: branchBdgId,
        task_code: 'MYCHECK_SHIFT_CLOSE',
        task_name_snapshot: 'Tutup Shift',
        points_per_unit_snapshot: 2.00,
        source_app: 'mycheck',
        event_id: `mycheck-close-budi-${dateStr}`,
        idempotency_key: `mycheck-close-budi-${dateStr}`,
        quantity: 1,
        points: 2.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T21:40:12.000+07:00`,
        meta: { shift: 'closing', notes: 'Closing SOP bersih & rekap kas selesai' },
      });
    }

    // Stokis Opname Bandung (selang seling Siti & Budi)
    const soOperatorBdg = dayIndex % 2 === 0 ? siti : budi;
    const sesiBdg = `SO-BDG-${dateStr.replace(/-/g, '')}`;
    ledgerRows.push({
      person_id: soOperatorBdg.id,
      branch_id: branchBdgId,
      task_code: 'STOKIS_OPNAME',
      task_name_snapshot: 'Opname Stok',
      points_per_unit_snapshot: 3.00,
      source_app: 'stokis',
      event_id: `stokis-so-bdg-${dateStr}`,
      idempotency_key: `stokis-so-bdg-${dateStr}`,
      quantity: 1,
      points: 3.00,
      shift_date: dateStr,
      occurred_at: `${dateStr}T17:10:00.000+07:00`,
      meta: { sesiId: sesiBdg, itemsCount: 22, operator: soOperatorBdg.name },
    });

    reportsToInsert.push({
      app_id: 'stokis',
      branch_id: branchBdgId,
      period_label: `Opname Stok Bandung - ${dateStr}`,
      period_start: `${dateStr}T17:00:00.000Z`,
      period_end: `${dateStr}T17:30:00.000Z`,
      status: 'submitted',
      total_points: 3.00,
      external_ref: sesiBdg,
      created_by: soOperatorBdg.id,
    });

    // Mutasi barang Bandung (tiap Rabu & Sabtu)
    if (dayOfWeek === 3 || dayOfWeek === 6) {
      ledgerRows.push({
        person_id: budi.id,
        branch_id: branchBdgId,
        task_code: 'STOKIS_MUTASI',
        task_name_snapshot: 'Mutasi Barang',
        points_per_unit_snapshot: 1.00,
        source_app: 'stokis',
        event_id: `stokis-mutasi-budi-${dateStr}`,
        idempotency_key: `stokis-mutasi-budi-${dateStr}`,
        quantity: 3,
        points: 3.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T11:05:40.000+07:00`,
        meta: { type: 'inbound', from: 'Gudang Pusat' },
      });
    }

    // Insiden di Bandung (1x setiap 10 hari)
    if (dayIndex % 10 === 3) {
      ledgerRows.push({
        person_id: siti.id,
        branch_id: branchBdgId,
        task_code: 'MYCHECK_INCIDENT',
        task_name_snapshot: 'Laporan Insiden',
        points_per_unit_snapshot: 1.50,
        source_app: 'mycheck',
        event_id: `mycheck-incident-siti-${dateStr}`,
        idempotency_key: `mycheck-incident-siti-${dateStr}`,
        quantity: 1,
        points: 1.50,
        shift_date: dateStr,
        occurred_at: `${dateStr}T15:20:00.000+07:00`,
        meta: { kategori: 'Perangkat', catatan: 'Thermal printer kasir paper jam, sudah diganti roll baru' },
      });
    }

    // -------------------------------------------------------------
    // CABANG 2: JAKARTA (Agus = Manager, Rina = Staff)
    // -------------------------------------------------------------
    // Rina Hadir (kecuali hari libur bergantian tiap Rabu)
    if (dayOfWeek !== 3) {
      ledgerRows.push({
        person_id: rina.id,
        branch_id: branchJktId,
        task_code: 'MYCHECK_HADIR',
        task_name_snapshot: 'Hadir Tepat Waktu',
        points_per_unit_snapshot: 1.00,
        source_app: 'mycheck',
        event_id: `mycheck-hadir-rina-${dateStr}`,
        idempotency_key: `mycheck-hadir-rina-${dateStr}`,
        quantity: 1,
        points: 1.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T07:25:30.000+07:00`,
        meta: { shift: 'opening' },
      });

      // Rina input order pelanggan (12 - 24 order)
      const orderQtyJkt = 12 + (dayIndex % 8);
      ledgerRows.push({
        person_id: rina.id,
        branch_id: branchJktId,
        task_code: 'MYCUST_ORDER',
        task_name_snapshot: 'Proses Order',
        points_per_unit_snapshot: 0.50,
        source_app: 'mycustomer',
        event_id: `mycust-order-rina-${dateStr}`,
        idempotency_key: `mycust-order-rina-${dateStr}`,
        quantity: orderQtyJkt,
        points: Number((orderQtyJkt * 0.50).toFixed(2)),
        shift_date: dateStr,
        occurred_at: `${dateStr}T16:05:15.000+07:00`,
        meta: { channel: 'pos_takeaway', totalOrders: orderQtyJkt },
      });
    }

    // Agus Hadir (kecuali hari libur tiap Kamis)
    if (dayOfWeek !== 4) {
      ledgerRows.push({
        person_id: agus.id,
        branch_id: branchJktId,
        task_code: 'MYCHECK_HADIR',
        task_name_snapshot: 'Hadir Tepat Waktu',
        points_per_unit_snapshot: 1.00,
        source_app: 'mycheck',
        event_id: `mycheck-hadir-agus-${dateStr}`,
        idempotency_key: `mycheck-hadir-agus-${dateStr}`,
        quantity: 1,
        points: 1.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T07:40:00.000+07:00`,
        meta: { shift: 'opening' },
      });

      // Agus tutup shift sore
      ledgerRows.push({
        person_id: agus.id,
        branch_id: branchJktId,
        task_code: 'MYCHECK_SHIFT_CLOSE',
        task_name_snapshot: 'Tutup Shift',
        points_per_unit_snapshot: 2.00,
        source_app: 'mycheck',
        event_id: `mycheck-close-agus-${dateStr}`,
        idempotency_key: `mycheck-close-agus-${dateStr}`,
        quantity: 1,
        points: 2.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T21:45:00.000+07:00`,
        meta: { shift: 'closing', notes: 'Laporan keuangan shift klop' },
      });
    }

    // Stokis Opname Jakarta
    const soOperatorJkt = dayIndex % 2 === 0 ? rina : agus;
    const sesiJkt = `SO-JKT-${dateStr.replace(/-/g, '')}`;
    ledgerRows.push({
      person_id: soOperatorJkt.id,
      branch_id: branchJktId,
      task_code: 'STOKIS_OPNAME',
      task_name_snapshot: 'Opname Stok',
      points_per_unit_snapshot: 3.00,
      source_app: 'stokis',
      event_id: `stokis-so-jkt-${dateStr}`,
      idempotency_key: `stokis-so-jkt-${dateStr}`,
      quantity: 1,
      points: 3.00,
      shift_date: dateStr,
      occurred_at: `${dateStr}T17:35:00.000+07:00`,
      meta: { sesiId: sesiJkt, itemsCount: 26, operator: soOperatorJkt.name },
    });

    reportsToInsert.push({
      app_id: 'stokis',
      branch_id: branchJktId,
      period_label: `Opname Stok Jakarta - ${dateStr}`,
      period_start: `${dateStr}T17:30:00.000Z`,
      period_end: `${dateStr}T18:00:00.000Z`,
      status: 'submitted',
      total_points: 3.00,
      external_ref: sesiJkt,
      created_by: soOperatorJkt.id,
    });

    // Mutasi barang Jakarta (tiap Selasa & Jumat)
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      ledgerRows.push({
        person_id: agus.id,
        branch_id: branchJktId,
        task_code: 'STOKIS_MUTASI',
        task_name_snapshot: 'Mutasi Barang',
        points_per_unit_snapshot: 1.00,
        source_app: 'stokis',
        event_id: `stokis-mutasi-agus-${dateStr}`,
        idempotency_key: `stokis-mutasi-agus-${dateStr}`,
        quantity: 4,
        points: 4.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T10:45:10.000+07:00`,
        meta: { type: 'inbound', from: 'Supplier Sayur Segar' },
      });
    }

    // Tiket Pelanggan Jakarta (1x per 5 hari)
    if (dayIndex % 5 === 2) {
      ledgerRows.push({
        person_id: rina.id,
        branch_id: branchJktId,
        task_code: 'MYCUST_TIKET',
        task_name_snapshot: 'Penanganan Tiket Pelanggan',
        points_per_unit_snapshot: 2.00,
        source_app: 'mycustomer',
        event_id: `mycust-tiket-rina-${dateStr}`,
        idempotency_key: `mycust-tiket-rina-${dateStr}`,
        quantity: 1,
        points: 2.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T18:12:00.000+07:00`,
        meta: { tipe: 'loyalty_inquiry', status: 'resolved' },
      });
    }

    // -------------------------------------------------------------
    // ADMIN: DEA (Supervisi berkala setiap 3 hari)
    // -------------------------------------------------------------
    if (dayIndex % 3 === 0) {
      const targetBranch = dayIndex % 2 === 0 ? branchBdgId : branchJktId;
      ledgerRows.push({
        person_id: dea.id,
        branch_id: targetBranch,
        task_code: 'MYCHECK_HADIR',
        task_name_snapshot: 'Hadir Tepat Waktu',
        points_per_unit_snapshot: 1.00,
        source_app: 'mycheck',
        event_id: `mycheck-hadir-dea-${dateStr}`,
        idempotency_key: `mycheck-hadir-dea-${dateStr}`,
        quantity: 1,
        points: 1.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T08:30:00.000+07:00`,
        meta: { shift: 'supervisi' },
      });
      ledgerRows.push({
        person_id: dea.id,
        branch_id: targetBranch,
        task_code: 'MYCHECK_SHIFT_CLOSE',
        task_name_snapshot: 'Tutup Shift',
        points_per_unit_snapshot: 2.00,
        source_app: 'mycheck',
        event_id: `mycheck-audit-dea-${dateStr}`,
        idempotency_key: `mycheck-audit-dea-${dateStr}`,
        quantity: 1,
        points: 2.00,
        shift_date: dateStr,
        occurred_at: `${dateStr}T20:30:00.000+07:00`,
        meta: { audit: 'audit_manajerial_bulanan' },
      });
    }
  }

  console.log(`  ✓ Berhasil membuat ${ledgerRows.length} entri point_ledger.`);

  // Insert ledger in batches of 100 (append-only trigger prohibits update/delete)
  const BATCH_SIZE = 100;
  const { data: existingEvents } = await supabase.from('point_ledger').select('event_id');
  const existingSet = new Set((existingEvents || []).map((e: any) => e.event_id));
  const newLedgerRows = ledgerRows.filter(r => !existingSet.has(r.event_id));

  if (newLedgerRows.length > 0) {
    for (let i = 0; i < newLedgerRows.length; i += BATCH_SIZE) {
      const batch = newLedgerRows.slice(i, i + BATCH_SIZE);
      const { error: insErr } = await supabase.from('point_ledger').insert(batch);
      if (insErr) {
        console.error(`  ❌ Gagal insert batch ledger ${i}:`, insErr.message);
        throw insErr;
      }
    }
  }
  console.log(`  ✓ ${newLedgerRows.length} entri point_ledger baru ditambahkan (${ledgerRows.length} total operasional).`);

  // ==========================================================================
  // 5. POINT ROLLUPS (Harian dan Bulanan)
  // ==========================================================================
  console.log('\n📊 [5/6] Menghitung dan menyimpan point_rollups (Harian & Bulanan)...');

  // Daily Rollups
  const dayMap = new Map<string, { person_id: string; branch_id: string; period_type: string; period_key: string; total_points: number; total_quantity: number; event_count: number }>();
  // Monthly Rollups
  const monthMap = new Map<string, { person_id: string; branch_id: string; period_type: string; period_key: string; total_points: number; total_quantity: number; event_count: number }>();

  for (const row of ledgerRows) {
    // Day Key
    const dKey = `${row.person_id}:${row.branch_id}:${row.shift_date}`;
    const dayItem = dayMap.get(dKey) || {
      person_id: row.person_id,
      branch_id: row.branch_id,
      period_type: 'day',
      period_key: row.shift_date,
      total_points: 0,
      total_quantity: 0,
      event_count: 0,
    };
    dayItem.total_points += row.points;
    dayItem.total_quantity += row.quantity;
    dayItem.event_count += 1;
    dayMap.set(dKey, dayItem);

    // Month Key
    const monthKey = row.shift_date.slice(0, 7); // YYYY-MM
    const mKey = `${row.person_id}:${row.branch_id}:${monthKey}`;
    const monthItem = monthMap.get(mKey) || {
      person_id: row.person_id,
      branch_id: row.branch_id,
      period_type: 'month',
      period_key: monthKey,
      total_points: 0,
      total_quantity: 0,
      event_count: 0,
    };
    monthItem.total_points += row.points;
    monthItem.total_quantity += row.quantity;
    monthItem.event_count += 1;
    monthMap.set(mKey, monthItem);
  }

  const allRollups = [
    ...Array.from(dayMap.values()).map(r => ({ ...r, total_points: Number(r.total_points.toFixed(2)), total_quantity: Number(r.total_quantity.toFixed(2)) })),
    ...Array.from(monthMap.values()).map(r => ({ ...r, total_points: Number(r.total_points.toFixed(2)), total_quantity: Number(r.total_quantity.toFixed(2)) })),
  ];

  for (let i = 0; i < allRollups.length; i += BATCH_SIZE) {
    const batch = allRollups.slice(i, i + BATCH_SIZE);
    const { error: rErr } = await supabase.from('point_rollups').upsert(batch, {
      onConflict: 'person_id,branch_id,period_type,period_key',
    });
    if (rErr) throw new Error('Gagal upsert point_rollups: ' + rErr.message);
  }
  console.log(`  ✓ Berhasil menyimpan ${allRollups.length} baris rollup (${dayMap.size} harian, ${monthMap.size} bulanan).`);

  // Simpan reports & contributors Stokis
  console.log('\n📦 [6/6] Menyiapkan data laporan Stokis & CRM Customers...');
  await supabase.from('report_contributors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('point_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reports').delete().eq('app_id', 'stokis');

  for (let i = 0; i < reportsToInsert.length; i += BATCH_SIZE) {
    const batch = reportsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('reports').insert(batch);
    if (insErr) console.error('Error insert reports batch:', insErr);
  }

  // Ambil report ID hasil insert untuk membuat kontributor & point_logs
  const { data: savedReports } = await supabase.from('reports').select('id, branch_id, external_ref, created_by').eq('app_id', 'stokis');
  if (savedReports && savedReports.length > 0) {
    for (const rep of savedReports) {
      contributorsToInsert.push({
        report_id: rep.id,
        user_id: rep.created_by,
        items_count: 22,
        points_earned: 3.00,
      });
      pointLogsToInsert.push({
        app_id: 'stokis',
        user_id: rep.created_by,
        branch_id: rep.branch_id,
        activity_type: 'so_item',
        points_earned: 3.00,
        points_original: 3.00,
        report_id: rep.id,
        metadata: { sesi_id: rep.external_ref },
      });
    }

    for (let i = 0; i < contributorsToInsert.length; i += BATCH_SIZE) {
      await supabase.from('report_contributors').insert(contributorsToInsert.slice(i, i + BATCH_SIZE));
    }
    for (let i = 0; i < pointLogsToInsert.length; i += BATCH_SIZE) {
      await supabase.from('point_logs').insert(pointLogsToInsert.slice(i, i + BATCH_SIZE));
    }
  }
  console.log(`  ✓ ${savedReports?.length || 0} laporan SO dan log poin Stokis tersimpan.`);

  // Pelanggan Nyata (CRM)
  const customersData = [
    { name: 'Andi Wijaya', phone: '081211112222', email: 'andi@gmail.com', branch_id: branchBdgId, status: 'active', segment: 'premium', customer_type: 'retail', city: 'Bandung', address: 'Jl. Riau No. 12', total_spent: 1450000, total_purchases: 14, created_by: dea.id },
    { name: 'Bella Safitri', phone: '081211113333', email: 'bella@gmail.com', branch_id: branchBdgId, status: 'active', segment: 'regular', customer_type: 'retail', city: 'Bandung', address: 'Jl. Dago No. 45', total_spent: 850000, total_purchases: 8, created_by: dea.id },
    { name: 'Citra Kirana', phone: '081211114444', email: 'citra@gmail.com', branch_id: branchBdgId, status: 'active', segment: 'regular', customer_type: 'retail', city: 'Bandung', address: 'Jl. Buah Batu No. 20', total_spent: 320000, total_purchases: 3, created_by: dea.id },
    { name: 'Deni Kurniawan', phone: '081211115555', email: 'deni@gmail.com', branch_id: branchBdgId, status: 'active', segment: 'premium', customer_type: 'wholesale', city: 'Bandung', address: 'Jl. Soekarno Hatta No. 101', total_spent: 2100000, total_purchases: 22, created_by: dea.id },
    { name: 'Eka Prasetya', phone: '081211116666', email: 'eka@gmail.com', branch_id: branchBdgId, status: 'active', segment: 'regular', customer_type: 'retail', city: 'Bandung', address: 'Jl. Cihampelas No. 78', total_spent: 740000, total_purchases: 7, created_by: dea.id },
    { name: 'Fani Oktavia', phone: '081322221111', email: 'fani@gmail.com', branch_id: branchJktId, status: 'active', segment: 'premium', customer_type: 'retail', city: 'Jakarta Selatan', address: 'Jl. Kemang Raya No. 15', total_spent: 3400000, total_purchases: 29, created_by: dea.id },
    { name: 'Gilang Ramadhan', phone: '081322222222', email: 'gilang@gmail.com', branch_id: branchJktId, status: 'active', segment: 'premium', customer_type: 'corporate', city: 'Jakarta Selatan', address: 'Sudirman Central Business District', total_spent: 1890000, total_purchases: 18, created_by: dea.id },
    { name: 'Hani Susanti', phone: '081322223333', email: 'hani@gmail.com', branch_id: branchJktId, status: 'active', segment: 'regular', customer_type: 'retail', city: 'Jakarta Selatan', address: 'Jl. Radio Dalam No. 8', total_spent: 920000, total_purchases: 9, created_by: dea.id },
    { name: 'Irfan Hakim', phone: '081322224444', email: 'irfan@gmail.com', branch_id: branchJktId, status: 'active', segment: 'regular', customer_type: 'retail', city: 'Jakarta Selatan', address: 'Jl. Tebet Barat No. 34', total_spent: 250000, total_purchases: 2, created_by: dea.id },
    { name: 'Joko Widodo', phone: '081322225555', email: 'joko@gmail.com', branch_id: branchJktId, status: 'active', segment: 'premium', customer_type: 'corporate', city: 'Jakarta Selatan', address: 'Kuningan Barat Kav 12', total_spent: 4200000, total_purchases: 35, created_by: dea.id },
  ];

  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: custErr } = await supabase.from('customers').insert(customersData);
  if (custErr) throw new Error('Gagal insert customers: ' + custErr.message);
  console.log(`  ✓ ${customersData.length} data customer CRM tersimpan.`);

  console.log('\n✨ SEMUA DATA DUMMY OPERASIONAL 3 BULAN SUDAH BERHASIL DIINJEK SECARA LANGSUNG KE SUPABASE!');
}

main().catch((err) => {
  console.error('\n❌ Gagal proses injeksi data:', err);
  process.exit(1);
});
