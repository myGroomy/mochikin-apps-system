import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMasterItemsFromDb,
  submitSOToDb,
  getPreviousSOFromDb,
  getOpnameDetailFromDb,
} from '../lib/domain/stokis-repository';
import { generateXlsxReport } from '../lib/domain/xlsx-report';
import { getSupabase } from '../lib/supabase';

test('Phase 3: RDBMS Supabase Stock Opname & Master Items Flow', async () => {
  const supabase = getSupabase();
  const testBranch = 'CBG01BDG';
  const testSesiId = `SES_TEST_${Date.now()}`;

  // 1. Uji Fetch Master Items dari Supabase
  const t0 = performance.now();
  const masterItems = await getMasterItemsFromDb(testBranch);
  const latencyItems = performance.now() - t0;

  console.log(`[LATENCY] getMasterItemsFromDb (${masterItems.length} items): ${latencyItems.toFixed(2)} ms`);
  assert.ok(masterItems.length > 0, 'Master items harus tersedia di database');
  assert.ok(masterItems.some((it) => it.Item_ID === 'AYAM_POTONG'));

  // 2. Uji Simpan Stock Opname (Header + Lines)
  const testPayload = {
    cabangId: testBranch,
    sesiId: testSesiId,
    tanggalOperasional: '2026-11-15',
    shift: 'closing',
    petugas: 'Taufik Alwan',
    items: [
      {
        itemId: 'AYAM_POTONG',
        namaBarang: 'Daging Ayam Fillet',
        area: 'Kitchen',
        satuan: 'kg',
        threshold: 5.0,
        step1: 10.0,
        step2: 2.5,
        total: 12.5,
        keterangan: 'Stok aman',
      },
      {
        itemId: 'TEPUNG_PREMIX',
        namaBarang: 'Tepung Bumbu Premix',
        area: 'Kitchen',
        satuan: 'kg',
        threshold: 3.0,
        step1: 1.0,
        step2: 0.5,
        total: 1.5,
        keterangan: 'Kritis - perlu refill',
      },
    ],
    note: 'Opname uji otomasi RDBMS Phase 3',
  };

  const t1 = performance.now();
  const submitResult = await submitSOToDb(testPayload);
  const latencySubmit = performance.now() - t1;

  console.log(`[LATENCY] submitSOToDb (2 items transaction): ${latencySubmit.toFixed(2)} ms`);
  assert.equal(submitResult.status, 'success');
  assert.equal(submitResult.sesiId, testSesiId);
  assert.equal(submitResult.rows_written, 2);

  // 3. Uji Idempotency: Sesi yang sama tidak boleh diduplikasi
  const duplicateResult = await submitSOToDb(testPayload);
  assert.equal(duplicateResult.status, 'already_processed');
  assert.equal(duplicateResult.rows_written, 0);

  // 4. Uji Fetch Previous SO dari Database
  const t2 = performance.now();
  const prevSO = await getPreviousSOFromDb(testBranch);
  const latencyPrev = performance.now() - t2;

  console.log(`[LATENCY] getPreviousSOFromDb: ${latencyPrev.toFixed(2)} ms`);
  assert.ok(prevSO.latest, 'Data SO terbaru harus ditemukan');
  assert.equal(prevSO.latest?.sesiId, testSesiId);
  assert.equal(prevSO.items['AYAM_POTONG']?.total, 12.5);
  assert.equal(prevSO.items['TEPUNG_PREMIX']?.total, 1.5);

  // 5. Uji Ambil Detail & Generate XLSX On-the-Fly via ExcelJS
  const t3 = performance.now();
  const detail = await getOpnameDetailFromDb(testSesiId);
  assert.ok(detail, 'Detail opname harus ditemukan');

  const { buffer, fileName } = await generateXlsxReport({
    laporanId: detail.header.laporanId,
    cabangNama: detail.header.cabangNama,
    cabangKode: detail.header.cabangId,
    tanggalOperasional: detail.header.tanggalOperasional,
    shift: detail.header.shift,
    petugas: detail.header.petugas,
    items: detail.items.map(it => ({ ...it, statusIsi: it.statusIsi as '' | 'Penuh' | 'Dipakai' | 'Habis' | undefined })),
    note: detail.header.note,
  });
  const latencyXlsx = performance.now() - t3;

  console.log(`[LATENCY] generateXlsxReport (${fileName}, ${buffer.length} bytes): ${latencyXlsx.toFixed(2)} ms`);
  assert.ok(buffer.length > 1000, 'Ukuran buffer berkas XLSX harus valid (>1KB)');
  assert.ok(fileName.endsWith('.xlsx'), 'Nama file harus bereksistensi .xlsx');

  // 6. Cleanup Data Uji dari Supabase
  await supabase.from('stokis_opnames').delete().eq('sesi_id', testSesiId);
  console.log('[CLEANUP] Data uji stokis berhasil dibersihkan.');
});
