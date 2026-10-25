// test/so-validation.test.js
// Unit test untuk logika validasi & ID generation SO (pure module).
// Jalankan: npm test
/* eslint-disable @typescript-eslint/no-require-imports */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateSOPayload_,
  isValidSesiId_,
  isValidTanggal_,
  isValidShift_,
  buildSesiId_,
  buildTransaksiId_,
  buildLaporanId_,
  normalizeCount_,
  MAX_ITEMS_PER_SESI,
} = require('../apps-script/SOValidation.js');

function validPayload(overrides = {}) {
  const items = Array.from({ length: 130 }, (_, i) => ({
    itemId: `ITM${String(i + 1).padStart(5, '0')}`,
    step1: i % 3,
    step2: 1,
    keterangan: i % 10 === 0 ? 'catatan' : '',
  }));
  return {
    sesiId: 'SES_TEST_130ITEMS123',
    tanggalOperasional: '2026-08-29',
    shift: 'Opening',
    petugas: 'Taufik Alwan',
    items,
    ...overrides,
  };
}

test('payload valid 130 item → ok, data ternormalisasi', () => {
  const result = validateSOPayload_(validPayload());
  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 130);
  assert.equal(result.data.sesiId, 'SES_TEST_130ITEMS123');
  const first = result.data.items[0];
  assert.equal(first.total, first.step1 + first.step2);
});

test('payload kosong → ditolak', () => {
  const result = validateSOPayload_(null);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors[0].code, 'PAYLOAD_INVALID');
});

test('payload tanpa items → ditolak', () => {
  const result = validateSOPayload_({ sesiId: 'SES_ABC123', tanggalOperasional: '2026-08-29', shift: 'Opening', petugas: 'X' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'ITEMS_REQUIRED'));
});

test('sesiId tidak valid → ditolak', () => {
  const result = validateSOPayload_({ ...validPayload(), sesiId: 'abc' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'SESI_ID_INVALID'));
});

test('tanggal tidak valid → ditolak', () => {
  const result = validateSOPayload_({ ...validPayload(), tanggalOperasional: '29-08-2026' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'TANGGAL_INVALID'));
});

test('shift tidak dikenal → ditolak', () => {
  const result = validateSOPayload_({ ...validPayload(), shift: 'Shift 3' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'SHIFT_INVALID'));
});

test('item duplikat dalam satu sesi → ditolak', () => {
  const payload = validPayload();
  payload.items = [payload.items[0], payload.items[0]];
  const result = validateSOPayload_(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'ITEM_DUPLICATE'));
});

test('step1 negatif / tidak angka → ditolak', () => {
  const payload = validPayload();
  payload.items[0].step1 = -5;
  const r1 = validateSOPayload_(payload);
  assert.equal(r1.ok, false);
  assert.ok(r1.errors.some(e => e.code === 'STEP1_INVALID'));

  payload.items[0].step1 = 'abc';
  const r2 = validateSOPayload_(payload);
  assert.equal(r2.ok, false);
});

test('step2 string numerik dapat dipakai (mis. "2")', () => {
  const payload = validPayload({ items: [{ itemId: 'ITM00001', step1: '3', step2: '2' }] });
  const result = validateSOPayload_(payload);
  assert.equal(result.ok, true);
  assert.equal(result.data.items[0].step2, 2);
});

test('itemId kosong → ditolak', () => {
  const payload = validPayload({ items: [{ itemId: '', step1: 1, step2: 0 }] });
  const result = validateSOPayload_(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'ITEM_ID_INVALID'));
});

test('jumlah item melebihi batas → ditolak', () => {
  const items = Array.from({ length: MAX_ITEMS_PER_SESI + 1 }, (_, i) => ({
    itemId: `ITM${String(i + 1).padStart(5, '0')}`,
    step1: 1,
    step2: 1,
  }));
  const result = validateSOPayload_({ ...validPayload(), items });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'ITEMS_TOO_MANY'));
});

test('keterangan bukan string → ditolak', () => {
  const payload = validPayload();
  payload.items[0].keterangan = 123;
  const result = validateSOPayload_(payload);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.code === 'KETERANGAN_INVALID'));
});

test('buildSesiId_ menghasilkan format valid', () => {
  const sid = buildSesiId_('8F3A2C1B');
  assert.equal(sid, 'SES_8F3A2C1B');
  assert.equal(isValidSesiId_(sid), true);
});

test('buildTransaksiId_ mengikuti pola TRX_YYYYMMDD_seq_rand', () => {
  const id = buildTransaksiId_('2026-08-29', 130, '8F3A');
  assert.equal(id, 'TRX_20260829_130_8F3A');
});

test('buildLaporanId_ mengikuti pola RPT_YYYYMMDD_rand', () => {
  assert.equal(buildLaporanId_('2026-08-29', 'ABCD1234'), 'RPT_20260829_ABCD1234');
});

test('isValidTanggal_ menolak tanggal mustahil', () => {
  assert.equal(isValidTanggal_('2026-13-40'), false);
  assert.equal(isValidTanggal_('2026-08-29'), true);
});

test('isValidShift_ hanya menerima Opening/Closing', () => {
  assert.equal(isValidShift_('Opening'), true);
  assert.equal(isValidShift_('Closing'), true);
  assert.equal(isValidShift_('opening'), false);
});

test('normalizeCount_ mengubah null/empty/invalid menjadi 0', () => {
  assert.equal(normalizeCount_(null), 0);
  assert.equal(normalizeCount_(''), 0);
  assert.equal(normalizeCount_(undefined), 0);
  assert.equal(normalizeCount_(5), 5);
});