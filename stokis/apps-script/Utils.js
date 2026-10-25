// Utils.js

var SO_COL = {
  Transaksi_ID: 1,
  Timestamp: 2,
  Tanggal_Operasional: 3,
  Shift: 4,
  Item_ID: 5,
  Nama_Barang: 6,
  Area: 7,
  Step1: 8,
  Step2: 9,
  Total: 10,
  Petugas: 11,
  Sesi_ID: 12,
  Keterangan: 13,
  Status_Isi: 14,
  Tgl_Refill: 15,
  Tgl_Pakai: 16,
  Note: 17,
};

function formatDate_(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getSheetByName_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan pada spreadsheet ID: ' + spreadsheet.getId());
  return sheet;
}

function sheetToObjects_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Error ber-code agar response API dapat distandardisasi.
 * code yang dikenali frontend: validation_error, already_processed,
 * not_found, unauthorized, server_error (fallback INTERNAL_ERROR).
 */
function ApiError_(code, message, details) {
  const err = new Error(message || code);
  err.name = 'ApiError';
  err.code = code;
  if (details) err.details = details;
  return err;
}

// Token acak untuk komponen ID (bukan sumber identitas tunggal).
function newRandomToken_(len) {
  return Utilities.getUuid().replace(/-/g, '').substring(0, len || 6).toUpperCase();
}

// Logging terstruktur (Phase 14). Output JSON ke StackDriver (Logger.log)
// sehingga request dapat ditelusuri berdasarkan request_id / sesi_id.
function logSORequest_(fields) {
  const entry = Object.assign({ ts: new Date().toISOString() }, fields || {});
  Logger.log('SO_LOG ' + JSON.stringify(entry));
}