import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';

// Memastikan variabel environment Supabase terisi sebelum koneksi
if (!process.env.SUPABASE_URL) {
  const currentDir = typeof import.meta.dirname === 'string' ? import.meta.dirname : process.cwd();
  const envCandidates = [
    path.resolve(currentDir, '../.env.local'),
    path.resolve(currentDir, '../../../.env.local'),
    path.resolve(currentDir, '../../../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === 'function') {
        try {
          process.loadEnvFile(envPath);
        } catch {
          // ignore error jika file tidak terbaca
        }
      }
      if (process.env.SUPABASE_URL) break;
    }
  }
}

test('MyCheck RDBMS Supabase Operational Flow (<1500ms latency)', async () => {
  const supabase = getSupabase();
  assert.ok(supabase, 'Supabase client harus terhubung dengan kredensial yang valid');

  // Warm-up koneksi DNS & TLS socket ke Supabase
  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select('id, code')
    .limit(1)
    .single();
  assert.ifError(branchErr);
  assert.ok(branch, 'Cabang harus tersedia di database');

  const { data: person, error: personErr } = await supabase
    .from('people')
    .select('id')
    .limit(1)
    .single();
  assert.ifError(personErr);
  assert.ok(person, 'Pengguna/Person harus tersedia di database');

  // Ambil atau buat definisi shift untuk foreign key
  let shiftDefId: string;
  let createdTestDef = false;
  const { data: existingDef } = await supabase
    .from('mycheck_shift_definitions')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existingDef) {
    shiftDefId = existingDef.id;
  } else {
    const { data: newDef, error: defErr } = await supabase
      .from('mycheck_shift_definitions')
      .insert({
        branch_id: branch.id,
        name: 'Shift Uji Integrasi',
        start_time: '08:00:00',
        end_time: '16:00:00',
        is_active: true,
      })
      .select('id')
      .single();
    assert.ifError(defErr);
    assert.ok(newDef, 'Shift definition uji harus berhasil dibuat');
    shiftDefId = newDef.id;
    createdTestDef = true;
  }

  const testShiftId = `SI_TEST_${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];
  let createdNotifId: string | null = null;
  let createdIncidentId: string | null = null;

  try {
    // 1. Insert test shift instance into mycheck_shift_instances
    const t1 = performance.now();
    const { data: shiftInstance, error: shiftErr } = await supabase
      .from('mycheck_shift_instances')
      .insert({
        id: testShiftId,
        branch_id: branch.id,
        shift_definition_id: shiftDefId,
        shift_date: today,
        status: 'open',
        pj_user_id: person.id,
        opened_at: new Date().toISOString(),
        is_test: true,
      })
      .select('*')
      .single();
    const latency1 = performance.now() - t1;

    console.log(`[LATENCY] Test 1: Insert shift instance: ${latency1.toFixed(2)} ms`);
    assert.ifError(shiftErr);
    assert.ok(shiftInstance, 'Shift instance harus berhasil dibuat');
    assert.equal(shiftInstance.id, testShiftId);
    assert.equal(shiftInstance.status, 'open');
    assert.ok(latency1 < 1500, `Latensi insert shift instance < 1500ms (aktual: ${latency1.toFixed(2)}ms)`);

    // 2. Insert test checklist entry into mycheck_entries
    const t2 = performance.now();
    const { data: entry, error: entryErr } = await supabase
      .from('mycheck_entries')
      .insert({
        shift_instance_id: testShiftId,
        point_text_snap: 'Area kasir bersih dan rapi',
        input_type: 'boolean',
        value_boolean: true,
        notes: 'Kondisi kasir siap operasi',
        filled_by_user_id: person.id,
        filled_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    const latency2 = performance.now() - t2;

    console.log(`[LATENCY] Test 2: Insert checklist entry: ${latency2.toFixed(2)} ms`);
    assert.ifError(entryErr);
    assert.ok(entry, 'Checklist entry harus berhasil disimpan');
    assert.equal(entry.shift_instance_id, testShiftId);
    assert.equal(entry.value_boolean, true);
    assert.ok(latency2 < 1500, `Latensi insert checklist entry < 1500ms (aktual: ${latency2.toFixed(2)}ms)`);

    // 3. Insert test handover into mycheck_handovers
    const t3 = performance.now();
    const { data: handover, error: handoverErr } = await supabase
      .from('mycheck_handovers')
      .insert({
        shift_instance_id: testShiftId,
        from_user_id: person.id,
        field_values: { cash_drawer: 500000, key_pos: true },
        notes: 'Semua peralatan dan uang kas lengkap',
        submitted_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    const latency3 = performance.now() - t3;

    console.log(`[LATENCY] Test 3: Insert handover: ${latency3.toFixed(2)} ms`);
    assert.ifError(handoverErr);
    assert.ok(handover, 'Handover harus berhasil disimpan');
    assert.equal(handover.shift_instance_id, testShiftId);
    assert.equal(handover.from_user_id, person.id);
    assert.ok(latency3 < 1500, `Latensi insert handover < 1500ms (aktual: ${latency3.toFixed(2)}ms)`);

    // 4. Insert test incident into mycheck_incidents
    const t4 = performance.now();
    const { data: incident, error: incidentErr } = await supabase
      .from('mycheck_incidents')
      .insert({
        branch_id: branch.id,
        shift_instance_id: testShiftId,
        category: 'Peralatan',
        title: 'Mesin POS Restart Tiba-tiba',
        description: 'Terjadi reboot otomatis pada terminal POS 1 saat melayani transaksi',
        severity: 'medium',
        status: 'open',
        reported_by_id: person.id,
        reported_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    const latency4 = performance.now() - t4;

    console.log(`[LATENCY] Test 4: Insert incident: ${latency4.toFixed(2)} ms`);
    assert.ifError(incidentErr);
    assert.ok(incident, 'Incident harus berhasil disimpan');
    assert.equal(incident.shift_instance_id, testShiftId);
    assert.equal(incident.status, 'open');
    createdIncidentId = incident.id;
    assert.ok(latency4 < 1500, `Latensi insert incident < 1500ms (aktual: ${latency4.toFixed(2)}ms)`);

    // 5. Insert test notification into mycheck_notifications and update is_read = true
    const t5a = performance.now();
    const { data: notif, error: notifErr } = await supabase
      .from('mycheck_notifications')
      .insert({
        user_id: person.id,
        branch_id: branch.id,
        type: 'shift_alert',
        title: 'Notifikasi Uji RDBMS',
        body: 'Notifikasi integrasi otomatis dari test flow',
        link: `/shifts/${testShiftId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    const latency5a = performance.now() - t5a;

    console.log(`[LATENCY] Test 5a: Insert notification: ${latency5a.toFixed(2)} ms`);
    assert.ifError(notifErr);
    assert.ok(notif, 'Notifikasi harus berhasil disimpan');
    assert.equal(notif.is_read, false);
    createdNotifId = notif.id;
    assert.ok(latency5a < 1500, `Latensi insert notification < 1500ms (aktual: ${latency5a.toFixed(2)}ms)`);

    const t5b = performance.now();
    const { data: updatedNotif, error: updateNotifErr } = await supabase
      .from('mycheck_notifications')
      .update({ is_read: true })
      .eq('id', notif.id)
      .select('*')
      .single();
    const latency5b = performance.now() - t5b;

    console.log(`[LATENCY] Test 5b: Update notification is_read: ${latency5b.toFixed(2)} ms`);
    assert.ifError(updateNotifErr);
    assert.ok(updatedNotif, 'Notifikasi harus berhasil diupdate');
    assert.equal(updatedNotif.is_read, true);
    assert.ok(latency5b < 1500, `Latensi update notification < 1500ms (aktual: ${latency5b.toFixed(2)}ms)`);

    // 6. Update shift instance status to 'closed'
    const t6 = performance.now();
    const { data: closedShift, error: closeErr } = await supabase
      .from('mycheck_shift_instances')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', testShiftId)
      .select('*')
      .single();
    const latency6 = performance.now() - t6;

    console.log(`[LATENCY] Test 6: Update shift instance status to closed: ${latency6.toFixed(2)} ms`);
    assert.ifError(closeErr);
    assert.ok(closedShift, 'Shift instance harus berhasil ditutup');
    assert.equal(closedShift.status, 'closed');
    assert.ok(closedShift.closed_at !== null);
    assert.ok(latency6 < 1500, `Latensi close shift instance < 1500ms (aktual: ${latency6.toFixed(2)}ms)`);
  } finally {
    // Cleanup data uji
    if (createdIncidentId) {
      await supabase.from('mycheck_incidents').delete().eq('id', createdIncidentId);
    }
    if (createdNotifId) {
      await supabase.from('mycheck_notifications').delete().eq('id', createdNotifId);
    }
    await supabase.from('mycheck_entries').delete().eq('shift_instance_id', testShiftId);
    await supabase.from('mycheck_handovers').delete().eq('shift_instance_id', testShiftId);
    await supabase.from('mycheck_shift_instances').delete().eq('id', testShiftId);

    if (createdTestDef) {
      await supabase.from('mycheck_shift_definitions').delete().eq('id', shiftDefId);
    }
    console.log('[CLEANUP] Data uji MyCheck RDBMS flow berhasil dibersihkan.');
  }
});
