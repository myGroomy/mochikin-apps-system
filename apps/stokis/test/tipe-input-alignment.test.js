const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Master item normalization logic (mirrors normalizeTipeInput in master-item-service.ts)
const BASE_TYPES = ['dual', 'single', 'boolean', 'date', 'text', 'expiry'];

function normalizeTipeInput(raw) {
  if (raw === undefined || raw === null) return 'dual';
  const val = String(raw).toLowerCase().trim();
  if (val === '') return '';
  const allowedBase = new Set(BASE_TYPES);
  const parts = val.split(',').map((t) => t.trim()).filter((t) => allowedBase.has(t));
  const unique = [...new Set(parts)];
  if (unique.includes('dual') && unique.includes('single')) {
    unique.splice(unique.indexOf('single'), 1);
  }
  return unique.join(',');
}

// Master item selection helpers (mirrors master-item/page.tsx)
function parseTipeSelection(val) {
  if (!val || !val.trim()) return new Set();
  return new Set(val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

function tipeSelectionToComma(selected) {
  if (selected.size === 0) return '';
  const sel = new Set(selected);
  if (sel.has('dual') && sel.has('single')) sel.delete('single');
  const ordered = [];
  if (sel.has('dual')) ordered.push('dual');
  else if (sel.has('single')) ordered.push('single');
  if (sel.has('boolean')) ordered.push('boolean');
  if (sel.has('date')) ordered.push('date');
  if (sel.has('expiry')) ordered.push('expiry');
  if (sel.has('text')) ordered.push('text');
  for (const item of sel) {
    if (!ordered.includes(item)) ordered.push(item);
  }
  return ordered.join(',');
}

function formatTipeLabel(val) {
  if (!val || !val.trim()) return 'Pilih Tipe';
  const parts = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const labels = parts.map((p) => {
    if (p === 'dual') return 'Dual';
    if (p === 'single') return 'Single';
    if (p === 'boolean') return 'Boolean';
    if (p === 'date') return 'Date';
    if (p === 'expiry') return 'Expiry';
    if (p === 'text') return 'Text';
    return p;
  });
  return labels.length > 0 ? labels.join(' + ') : 'Pilih Tipe';
}

// SO Input parse logic (mirrors parseTipeInput in so.ts)
function parseTipeInput(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return ['dual'];
  const allowed = new Set(['single', 'dual', 'boolean', 'date', 'text', 'expiry']);
  const parsed = s
    .split(',')
    .map((t) => {
      const trimmed = t.trim();
      if (trimmed === 'utilitas') return 'boolean';
      return trimmed;
    })
    .filter((t) => allowed.has(t));
  return parsed.length > 0 ? parsed : ['dual'];
}

function hasTipe(tipeInput, tipe) {
  return tipeInput.includes(tipe);
}

// Laporan View normalization (mirrors normalizeStatusIsi in laporan-view.ts)
function normalizeStatusIsi(val, total) {
  if (val != null) {
    const s = String(val).trim().toLowerCase();
    if (s === 'penuh' || s === 'full' || s === 'true' || s === '1' || s === 'ada' || s === 'aman') return 'Penuh';
    if (s === 'dipakai' || s === 'hampir' || s === 'sedang dipakai') return 'Dipakai';
    if (s === 'habis' || s === 'empty' || s === 'false' || s === '0' || s === 'kosong' || s === 'kritis') return 'Habis';
  }
  if (total != null && Number.isFinite(total) && total > 0) {
    return 'Penuh';
  }
  return '';
}

describe('Tipe Input Alignment - Master Items, SO Input, & Laporan', () => {
  describe('Master Item: normalizeTipeInput & Selection Logic', () => {
    it('mengizinkan deselect semua tipe (empty string tetap empty string, bukan dipaksa dual)', () => {
      assert.equal(normalizeTipeInput(''), '');
      assert.equal(normalizeTipeInput('   '), '');
      assert.equal(tipeSelectionToComma(new Set()), '');
    });

    it('mempertahankan tipe tunggal secara bersih', () => {
      assert.equal(normalizeTipeInput('date'), 'date');
      assert.equal(normalizeTipeInput('boolean'), 'boolean');
      assert.equal(normalizeTipeInput('single'), 'single');
      assert.equal(normalizeTipeInput('dual'), 'dual');
      assert.equal(normalizeTipeInput('expiry'), 'expiry');
    });

    it('memformat label gabungan dengan formatTipeLabel', () => {
      assert.equal(formatTipeLabel(''), 'Pilih Tipe');
      assert.equal(formatTipeLabel('dual'), 'Dual');
      assert.equal(formatTipeLabel('single'), 'Single');
      assert.equal(formatTipeLabel('boolean,date'), 'Boolean + Date');
      assert.equal(formatTipeLabel('single,date'), 'Single + Date');
    });

    it('parseTipeSelection tidak memaksa dual jika string kosong', () => {
      const set = parseTipeSelection('');
      assert.equal(set.size, 0);
      assert.equal(set.has('dual'), false);
    });

    it('toggling checkbox dapat menghapus tipe yang sudah terpilih', () => {
      const draft = new Set(['dual']);
      // Toggle dual
      draft.delete('dual');
      assert.equal(draft.size, 0);
      assert.equal(tipeSelectionToComma(draft), '');
    });

    it('mempertahankan kombinasi compound types', () => {
      assert.equal(normalizeTipeInput('boolean,date'), 'boolean,date');
      assert.equal(normalizeTipeInput('date,boolean'), 'date,boolean');
      assert.equal(normalizeTipeInput('single,date'), 'single,date');
      assert.equal(normalizeTipeInput('dual,date'), 'dual,date');
    });

    it('menyelesaikan konflik dual dan single (dual menang)', () => {
      assert.equal(normalizeTipeInput('dual,single'), 'dual');
      assert.equal(normalizeTipeInput('single,dual'), 'dual');
      assert.equal(normalizeTipeInput('single,dual,date'), 'dual,date');
    });

    it('membersihkan nilai invalid / di luar allowed base', () => {
      assert.equal(normalizeTipeInput('invalid_type'), '');
      assert.equal(normalizeTipeInput('date,invalid_type'), 'date');
    });
  });

  describe('SO Input Form: parseTipeInput & hasTipe', () => {
    it('mengurai tipe tunggal ke array tipe yang sesuai', () => {
      assert.deepEqual(parseTipeInput('date'), ['date']);
      assert.deepEqual(parseTipeInput('boolean'), ['boolean']);
      assert.deepEqual(parseTipeInput('single'), ['single']);
      assert.deepEqual(parseTipeInput('dual'), ['dual']);
    });

    it('mengurai tipe kombinasi/compound dengan tepat', () => {
      assert.deepEqual(parseTipeInput('boolean,date'), ['boolean', 'date']);
      assert.equal(hasTipe(parseTipeInput('boolean,date'), 'boolean'), true);
      assert.equal(hasTipe(parseTipeInput('boolean,date'), 'date'), true);
      assert.equal(hasTipe(parseTipeInput('boolean,date'), 'dual'), false);
      assert.equal(hasTipe(parseTipeInput('boolean,date'), 'single'), false);
    });

    it('memetakan alias legacy utilitas menjadi boolean', () => {
      assert.deepEqual(parseTipeInput('utilitas'), ['boolean']);
    });

    it('fallback ke dual jika data kosong atau null untuk backwards compatibility', () => {
      assert.deepEqual(parseTipeInput(''), ['dual']);
      assert.deepEqual(parseTipeInput(null), ['dual']);
      assert.deepEqual(parseTipeInput(undefined), ['dual']);
    });
  });

  describe('Report View: normalizeStatusIsi & Table Structure', () => {
    it('menormalisasi status isi boolean dengan case-insensitive dan aliases', () => {
      assert.equal(normalizeStatusIsi('Penuh'), 'Penuh');
      assert.equal(normalizeStatusIsi('penuh'), 'Penuh');
      assert.equal(normalizeStatusIsi('full'), 'Penuh');
      assert.equal(normalizeStatusIsi('1'), 'Penuh');
      assert.equal(normalizeStatusIsi('true'), 'Penuh');

      assert.equal(normalizeStatusIsi('Dipakai'), 'Dipakai');
      assert.equal(normalizeStatusIsi('dipakai'), 'Dipakai');
      assert.equal(normalizeStatusIsi('hampir'), 'Dipakai');

      assert.equal(normalizeStatusIsi('Habis'), 'Habis');
      assert.equal(normalizeStatusIsi('habis'), 'Habis');
      assert.equal(normalizeStatusIsi('empty'), 'Habis');
      assert.equal(normalizeStatusIsi('kosong'), 'Habis');
      assert.equal(normalizeStatusIsi('0'), 'Habis');
      assert.equal(normalizeStatusIsi('false'), 'Habis');
    });

    it('fallback ke Penuh jika total numerik > 0 saat statusIsi kosong', () => {
      assert.equal(normalizeStatusIsi('', 5), 'Penuh');
      assert.equal(normalizeStatusIsi(null, 1), 'Penuh');
      assert.equal(normalizeStatusIsi(undefined, 0), '');
    });
  });
});
