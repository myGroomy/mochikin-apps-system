import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabase } from '../lib/supabase';

// Load environment if available
if (!process.env.SUPABASE_URL) {
  const envCandidates = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../../../.env.local'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === 'function') {
        try {
          process.loadEnvFile(envPath);
        } catch {
          // continue
        }
      }
    }
  }
}
import { seedRegistry, addBranchSheet, resetRegistryCache, branchSpreadsheetId } from './helpers/mock-registry';
import { addSheet } from './helpers/mock-sheets';
import { installSessionStub, setSession, makeRequest } from './helpers/mock-auth';
import { MONTHLY_SHEETS, STATIC_SHEETS, monthlySheet } from '../lib/google/branch-schema';

installSessionStub();

const USERS_HEADERS = ['User_ID', 'Username', 'PIN', 'Nama', 'Role', 'Cabang_ID', 'Aktif', 'Must_Change_Pin', 'Created_At'];

const BASE = 'http://localhost:3000';
const CAB1 = 'CAB1';
const TAB_MONTH = new Date().toISOString().slice(0, 7);

function seedTestBranch() {
  const workbook = seedRegistry([{ id: CAB1, name: 'Cabang Satu' }]);
  addSheet(workbook, 'Users', USERS_HEADERS, [{
    User_ID: 'petugas1',
    Username: 'petugas1',
    PIN: '123456',
    Nama: 'Petugas Uji',
    Role: 'petugas',
    Cabang_ID: CAB1,
    Aktif: true,
    Must_Change_Pin: false,
    Created_At: new Date().toISOString(),
  }], 'registry-uji');
  addBranchSheet(workbook, CAB1, 'ShiftDefinitions', STATIC_SHEETS.ShiftDefinitions, [
    {
      id: 'DEF1',
      name: 'Shift Pagi',
      start_time: '08:00:00',
      end_time: '16:00:00',
      crosses_midnight: false,
      sort_order: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ]);
  addBranchSheet(workbook, CAB1, 'SopCategories', STATIC_SHEETS.SopCategories, [
    {
      id: 'CAT1',
      shift_definition_id: 'DEF1',
      name: 'Opening Area',
      sort_order: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ]);
  addBranchSheet(workbook, CAB1, 'ChecklistPoints', STATIC_SHEETS.ChecklistPoints, [
    {
      id: 'PT1',
      sop_category_id: 'CAT1',
      point_ref: 'P1',
      title: 'Nyalakan Lampu Utama',
      input_type: 'centang',
      is_required: true,
      sort_order: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ]);
  addBranchSheet(workbook, CAB1, 'HandoverFields', STATIC_SHEETS.HandoverFields);
  addBranchSheet(workbook, CAB1, 'IncidentCategories', STATIC_SHEETS.IncidentCategories);
  addBranchSheet(workbook, CAB1, 'ShiftInstances', STATIC_SHEETS.ShiftInstances);
  addBranchSheet(workbook, CAB1, 'Participants', STATIC_SHEETS.Participants);
  addBranchSheet(workbook, CAB1, 'AuditLog', MONTHLY_SHEETS.AuditLog);
  addBranchSheet(workbook, CAB1, '_meta', STATIC_SHEETS._meta);
  addBranchSheet(workbook, CAB1, monthlySheet('Entries', TAB_MONTH), MONTHLY_SHEETS.Entries);
  addBranchSheet(workbook, CAB1, monthlySheet('EntryLogs', TAB_MONTH), MONTHLY_SHEETS.EntryLogs);
  addBranchSheet(workbook, CAB1, monthlySheet('Handovers', TAB_MONTH), MONTHLY_SHEETS.Handovers);
  addBranchSheet(workbook, CAB1, monthlySheet('Photos', TAB_MONTH), MONTHLY_SHEETS.Photos);
  addBranchSheet(workbook, CAB1, 'Reports', STATIC_SHEETS.Reports);

  resetRegistryCache();
  return workbook;
}

test('MyCheck Shift Lifecycle Supabase Dual-Path Operations', async () => {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('[SKIP] Supabase env not available');
    return;
  }

  seedTestBranch();
  setSession({
    username: 'petugas1',
    nama: 'Petugas Uji',
    role: 'petugas',
    cabangId: CAB1,
    userId: 'petugas1',
  });

  const { data: branch } = await supabase.from('branches').select('id, code').limit(1).single();
  const { data: person } = await supabase.from('people').select('id, username').limit(1).single();
  assert.ok(branch, 'Branch required');
  assert.ok(person, 'Person required');

  let shiftDefId: string;
  const { data: existingDef } = await supabase.from('mycheck_shift_definitions').select('id').limit(1).maybeSingle();
  if (existingDef) {
    shiftDefId = existingDef.id;
  } else {
    const { data: newDef } = await supabase
      .from('mycheck_shift_definitions')
      .insert({
        branch_id: branch.id,
        name: 'Shift Lifecycle Uji',
        start_time: '07:00:00',
        end_time: '15:00:00',
        is_active: true,
      })
      .select('id')
      .single();
    assert.ok(newDef);
    shiftDefId = newDef.id;
  }

  const testShiftInstanceId = `SI_TEST_LC_${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Insert shift instance directly into Supabase
    const { data: inst, error: instErr } = await supabase.from('mycheck_shift_instances').insert({
      id: testShiftInstanceId,
      branch_id: branch.id,
      shift_definition_id: shiftDefId,
      shift_date: today,
      status: 'open',
      pj_user_id: person.id,
      opened_at: new Date().toISOString(),
      is_test: true,
      template_snapshot: {
        shift: { name: 'Shift Lifecycle Uji', start_time: '07:00:00', end_time: '15:00:00' },
        categories: [
          {
            id: 'CAT1',
            name: 'Opening Area',
            sort_order: 1,
            points: [
              {
                point_ref: 'P1',
                title: 'Nyalakan Lampu Utama',
                input_type: 'centang',
                is_required: true,
                sort_order: 1,
              },
            ],
          },
        ],
      },
    }).select('*').single();
    assert.ifError(instErr);
    assert.ok(inst);
    assert.equal(inst.status, 'open');

    // 2. Insert entry into mycheck_entries
    const { data: entry, error: entryErr } = await supabase.from('mycheck_entries').insert({
      shift_instance_id: testShiftInstanceId,
      point_text_snap: 'Nyalakan Lampu Utama',
      input_type: 'centang',
      value_boolean: true,
      value_text: 'true',
      filled_by_user_id: person.id,
      filled_at: new Date().toISOString(),
    }).select('*').single();
    assert.ifError(entryErr);
    assert.ok(entry);

    // 3. Test GET /api/shifts/[id]/entries reads Supabase entries
    const { GET: getEntries } = await import('../app/api/shifts/[id]/entries/route');
    // Add instance to mock sheets as well so resolveInstance succeeds
    const workbook = seedTestBranch();
    addBranchSheet(workbook, CAB1, 'ShiftInstances', STATIC_SHEETS.ShiftInstances, [
      {
        id: testShiftInstanceId,
        shift_definition_id: 'DEF1',
        shift_date: today,
        tab_month: TAB_MONTH,
        status: 'berjalan',
        pj_user_id: 'petugas1',
        is_test: false,
        template_snapshot: JSON.stringify(inst.template_snapshot),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    resetRegistryCache();

    const reqEntries = makeRequest('GET', `${BASE}/api/shifts/${testShiftInstanceId}/entries`);
    const resEntries = await getEntries(reqEntries);
    assert.equal(resEntries.status, 200);
    const jsonEntries = await resEntries.json();
    assert.ok(jsonEntries.entries.length >= 1, 'Supabase entries should be returned');
    assert.equal(jsonEntries.entries[0].point_text_snap, 'Nyalakan Lampu Utama');

    // 4. Test GET /api/shifts/[id]/progress includes entry count
    const { GET: getProgress } = await import('../app/api/shifts/[id]/progress/route');
    const reqProgress = makeRequest('GET', `${BASE}/api/shifts/${testShiftInstanceId}/progress`);
    const resProgress = await getProgress(reqProgress);
    assert.equal(resProgress.status, 200);
    const jsonProgress = await resProgress.json();
    assert.ok(jsonProgress.progress.selesai >= 1, 'Progress should reflect Supabase entry');

    // 5. Test PUT /api/shifts/[id]/draft is resilient
    const { PUT: putDraft } = await import('../app/api/shifts/[id]/draft/route');
    const reqDraft = makeRequest('PUT', `${BASE}/api/shifts/${testShiftInstanceId}/draft`, {
      draft: {
        shiftInstanceId: testShiftInstanceId,
        userId: 'petugas1',
        shiftDate: today,
        updatedAt: Date.now(),
        points: { P1: { value: true } },
      },
    });
    const resDraft = await putDraft(reqDraft);
    assert.equal(resDraft.status, 200);

    // 6. Test POST /api/shifts/[id]/join touches Supabase state
    const { POST: postJoin } = await import('../app/api/shifts/[id]/join/route');
    const reqJoin = makeRequest('POST', `${BASE}/api/shifts/${testShiftInstanceId}/join`);
    const resJoin = await postJoin(reqJoin);
    assert.equal(resJoin.status, 200);

    // 7. Test POST /api/shifts/[id]/sync
    const { POST: postSync } = await import('../app/api/shifts/[id]/sync/route');
    const reqSync = makeRequest('POST', `${BASE}/api/shifts/${testShiftInstanceId}/sync`);
    const resSync = await postSync(reqSync);
    assert.equal(resSync.status, 200);

    // 8. Test POST /api/shifts/[id]/close updates status to closed in Supabase
    const { POST: postClose } = await import('../app/api/shifts/[id]/close/route');
    const reqClose = makeRequest('POST', `${BASE}/api/shifts/${testShiftInstanceId}/close`, {
      values: {},
      no_incident: true,
    });
    const resClose = await postClose(reqClose);
    assert.equal(resClose.status, 200);

    // Verify Supabase status is closed
    const { data: closedInst } = await supabase
      .from('mycheck_shift_instances')
      .select('status, closed_at')
      .eq('id', testShiftInstanceId)
      .single();
    assert.equal(closedInst?.status, 'closed', 'Status in Supabase should be closed');
    assert.ok(closedInst?.closed_at, 'closed_at in Supabase should be populated');

  } finally {
    // Cleanup
    await supabase.from('mycheck_entries').delete().eq('shift_instance_id', testShiftInstanceId);
    await supabase.from('mycheck_shift_instances').delete().eq('id', testShiftInstanceId);
  }
});
