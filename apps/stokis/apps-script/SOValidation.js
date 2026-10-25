// SOValidation.js
// Pure validation & normalization logic untuk payload Stock Opname.
//
// PENTING: Modul ini TIDAK menggunakan API Google Apps Script (no
// SpreadsheetApp, no Utilities, no PropertiesService) sehingga aman
// di-`require` dari Node untuk unit test (`node --test`).
// Apps Script merangkai file secara global-scope; guard `module.exports`
// di bawah hanya aktif ketika dijalankan dari Node.

var SHIFT_VALUES = ['Opening', 'Closing'];
var MAX_ITEMS_PER_SESI = 500;
var SESI_ID_RE = /^SES[_-][A-Za-z0-9_-]{4,64}$/i;
var ITEM_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
var TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidSesiId_(v) {
  return typeof v === 'string' && SESI_ID_RE.test(v.trim());
}

function isValidItemId_(v) {
  return typeof v === 'string' && ITEM_ID_RE.test(v.trim());
}

function isValidTanggal_(v) {
  if (typeof v !== 'string' || !TANGGAL_RE.test(v)) return false;
  var d = new Date(v + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function isValidShift_(v) {
  return SHIFT_VALUES.indexOf(v) !== -1;
}

function isNonNegativeNumber_(v) {
  if (typeof v === 'number') return isFinite(v) && v >= 0;
  if (typeof v === 'string' && v.trim() !== '') {
    var n = Number(v);
    return isFinite(n) && n >= 0;
  }
  return false;
}

function normalizeCount_(v) {
  if (v === undefined || v === null || v === '') return 0;
  var n = Number(v);
  return isFinite(n) && n >= 0 ? n : 0;
}

function padSeq_(n, len) {
  return String(n).padStart(len, '0');
}

// Membangun Sesi_ID unik dari token acak (mis. hasil Utilities.getUuid()).
function buildSesiId_(randomToken) {
  return 'SES_' + String(randomToken || '');
}

// Transaksi_ID dengan pola TRX_<YYYYMMDD>_<seq>_<randomToken>
// seq adalah urutan dalam satu sesi (1..N); randomToken menjamin
// keunikan lintas request/cabang.
function buildTransaksiId_(tanggalOperasional, seq, randomToken) {
  var datePart = String(tanggalOperasional).replace(/-/g, '');
  return 'TRX_' + datePart + '_' + padSeq_(seq, 3) + '_' + String(randomToken || '');
}

function buildLaporanId_(tanggalOperasional, randomToken) {
  var datePart = String(tanggalOperasional).replace(/-/g, '');
  return 'RPT_' + datePart + '_' + String(randomToken || '');
}

function buildCabangId_(randomToken) {
  return 'CBG' + String(randomToken || '');
}

function buildItemId_(randomToken) {
  return 'ITM' + String(randomToken || '');
}

function buildPetugasId_(randomToken) {
  return 'PTG' + String(randomToken || '');
}

/**
 * Validasi full payload SO.
 *
 * @param {Object} payload - body dari client.
 * @returns {{ok: true, data: Object} | {ok: false, errors: Array}}
 */
function validateSOPayload_(payload) {
  var errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: [{ code: 'PAYLOAD_INVALID', message: 'Payload kosong atau bukan object' }] };
  }

  var sesiId = typeof payload.sesiId === 'string' ? payload.sesiId.trim() : '';
  if (!isValidSesiId_(sesiId)) {
    errors.push({ code: 'SESI_ID_INVALID', message: 'sesiId wajib berupa identifier unik sesi' });
  }

  var tanggalOperasional = typeof payload.tanggalOperasional === 'string' ? payload.tanggalOperasional.trim() : '';
  if (!isValidTanggal_(tanggalOperasional)) {
    errors.push({ code: 'TANGGAL_INVALID', message: 'tanggalOperasional harus format YYYY-MM-DD' });
  }

  if (!isValidShift_(payload.shift)) {
    errors.push({ code: 'SHIFT_INVALID', message: 'shift harus "Opening" atau "Closing"' });
  }

  var petugas = typeof payload.petugas === 'string' ? payload.petugas.trim() : '';
  if (!petugas) {
    errors.push({ code: 'PETUGAS_REQUIRED', message: 'petugas wajib diisi' });
  }

  var items = Array.isArray(payload.items) ? payload.items : null;
  if (!items || items.length === 0) {
    errors.push({ code: 'ITEMS_REQUIRED', message: 'items wajib berisi minimal 1 item' });
  } else if (items.length > MAX_ITEMS_PER_SESI) {
    errors.push({ code: 'ITEMS_TOO_MANY', message: 'items melebihi batas maksimal ' + MAX_ITEMS_PER_SESI + ' item per sesi' });
  } else {
    var seen = {};
    items.forEach(function (item, i) {
      var label = 'item #' + (i + 1);
      if (!item || typeof item !== 'object') {
        errors.push({ code: 'ITEM_INVALID', message: label + ' bukan object' });
        return;
      }
      var itemId = typeof item.itemId === 'string' ? item.itemId.trim() : '';
      if (!isValidItemId_(itemId)) {
        errors.push({ code: 'ITEM_ID_INVALID', message: label + ' memiliki itemId tidak valid' });
      } else if (seen[itemId]) {
        errors.push({ code: 'ITEM_DUPLICATE', message: 'itemId duplikat dalam satu sesi: ' + itemId });
      } else {
        seen[itemId] = true;
      }
      if (!isNonNegativeNumber_(item.step1)) {
        errors.push({ code: 'STEP1_INVALID', message: label + ' step1 harus angka >= 0' });
      }
      if (!isNonNegativeNumber_(item.step2)) {
        errors.push({ code: 'STEP2_INVALID', message: label + ' step2 harus angka >= 0' });
      }
      if (item.keterangan !== undefined && item.keterangan !== null && typeof item.keterangan !== 'string') {
        errors.push({ code: 'KETERANGAN_INVALID', message: label + ' keterangan harus string' });
      }
      if (item.statusIsi !== undefined && item.statusIsi !== null && item.statusIsi !== '' &&
          ['Penuh', 'Dipakai', 'Habis'].indexOf(String(item.statusIsi)) === -1) {
        errors.push({ code: 'STATUS_ISI_INVALID', message: label + ' statusIsi harus "Penuh", "Dipakai", atau "Habis"' });
      }
      if (item.tglRefill !== undefined && item.tglRefill !== null && item.tglRefill !== '' &&
          !isValidTanggal_(item.tglRefill)) {
        errors.push({ code: 'TGL_REFILL_INVALID', message: label + ' tglRefill harus format YYYY-MM-DD' });
      }
      if (item.tglPakai !== undefined && item.tglPakai !== null && item.tglPakai !== '' &&
          !isValidTanggal_(item.tglPakai)) {
        errors.push({ code: 'TGL_PAKAI_INVALID', message: label + ' tglPakai harus format YYYY-MM-DD' });
      }
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors };
  }

  var normalizedItems = items.map(function (item) {
    var step1 = normalizeCount_(item.step1);
    var step2 = normalizeCount_(item.step2);
    return {
      itemId: String(item.itemId).trim(),
      step1: step1,
      step2: step2,
      total: step1 + step2,
      keterangan: typeof item.keterangan === 'string' ? item.keterangan : '',
      statusIsi: (['Penuh', 'Dipakai', 'Habis'].indexOf(String(item.statusIsi)) !== -1) ? item.statusIsi : '',
      tglRefill: typeof item.tglRefill === 'string' ? item.tglRefill : '',
      tglPakai: typeof item.tglPakai === 'string' ? item.tglPakai : '',
    };
  });

  return {
    ok: true,
    data: {
      sesiId: sesiId.toUpperCase(),
      tanggalOperasional: tanggalOperasional,
      shift: payload.shift,
      petugas: petugas,
      items: normalizedItems,
      note: typeof payload.note === 'string' ? payload.note.trim() : '',
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHIFT_VALUES: SHIFT_VALUES,
    MAX_ITEMS_PER_SESI: MAX_ITEMS_PER_SESI,
    isValidSesiId_: isValidSesiId_,
    isValidItemId_: isValidItemId_,
    isValidTanggal_: isValidTanggal_,
    isValidShift_: isValidShift_,
    isNonNegativeNumber_: isNonNegativeNumber_,
    normalizeCount_: normalizeCount_,
    buildSesiId_: buildSesiId_,
    buildTransaksiId_: buildTransaksiId_,
    buildLaporanId_: buildLaporanId_,
    buildCabangId_: buildCabangId_,
    buildItemId_: buildItemId_,
    buildPetugasId_: buildPetugasId_,
    validateSOPayload_: validateSOPayload_,
  };
}