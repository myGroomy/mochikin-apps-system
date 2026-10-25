// SO.js

const MAX_HISTORY_SESSIONS = 8;

/**
 * Submit satu sesi Stock Opname.
 *
 * Alur:
 *   1. Validasi payload (pure, di SOValidation.js).
 *   2. Ambil script lock (concurrency control antar request).
 *   3. Cek idempotency: jika Sesi_ID sudah pernah diproses, return
 *      { status: 'already_processed' } tanpa menambah baris.
 *   4. Bangun seluruh baris di memory → satu setValues() batch.
 *   5. Buat laporan PDF (non-critical, tetap error disimpan).
 *
 * @param {string} cabangId
 * @param {Object} payload - { sesiId, tanggalOperasional, shift, petugas, items }
 * @returns {{status: string, sesiId: string, laporanId: string|null, rows_written: number}}
 */
function submitSO(cabangId, payload) {
  const t0 = Date.now();
  const validation = validateSOPayload_(payload);
  if (!validation.ok) {
    const details = validation.errors.map(e => e.code + ': ' + e.message);
    throw ApiError_('validation_error', validation.errors.map(e => e.message).join('; '), details);
  }

  const sesiId = validation.data.sesiId;
  const itemsCount = validation.data.items.length;
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const { spreadsheet, cabang } = resolveCabangSpreadsheet_(cabangId);
    const soSheet = getSheetByName_(spreadsheet, 'SO_Transaksi');

    // ── Idempotency: Sesi_ID pernah diproses? ─────────────────────
    const existing = findSesiRecord_(soSheet, sesiId);
    if (existing.found) {
      logSORequest_({
        requestId: newRandomToken_(8), cabangId, sesiId,
        status: 'already_processed', items_count: itemsCount,
        rows_written: 0, processing_ms: Date.now() - t0,
      });
      return {
        status: 'already_processed',
        sesiId,
        rows_written: 0,
        laporanId: existing.laporanId,
      };
    }

    // ── Master item untuk validasi itemId + enrich nama/area/threshold ──
    const masterRows = sheetToObjects_(getSheetByName_(spreadsheet, 'Master_Item'));
    const masterMap = {};
    masterRows.forEach(m => { masterMap[m['Item_ID']] = m; });

    const unknown = validation.data.items.filter(it => !masterMap[it.itemId]);
    if (unknown.length > 0) {
      throw ApiError_('validation_error',
        'Item tidak dikenal pada master cabang: ' + unknown.map(u => u.itemId).join(', '));
    }

    // ── Data SO sebelumnya (untuk kolom pembanding PDF) ────────────
    const prevData = getPreviousSO(cabangId);
    const prevItems = (prevData && prevData.items) || {};
    const prevInfo = (prevData && prevData.latest) || null;

    // ── Bangun baris seluruhnya di memory sebelum menulis ──────────
    const timestamp = new Date();
    const rows = [];
    const transaksiList = [];

    validation.data.items.forEach((it, idx) => {
      const master = masterMap[it.itemId];
      const transaksiId = buildTransaksiId_(validation.data.tanggalOperasional, idx + 1, newRandomToken_(4));
      const prev = prevItems[master['Nama_Barang']] || null;

      transaksiList.push({
        transaksiId,
        itemId: it.itemId,
        nama: master['Nama_Barang'],
        area: master['Area'],
        threshold: Number(master['Threshold']) || 0,
        step1: it.step1,
        step2: it.step2,
        total: it.total,
        keterangan: it.keterangan,
        prevStep1: prev ? prev.step1 : null,
        prevStep2: prev ? prev.step2 : null,
        prevTotal: prev ? prev.total : null,
      });

      rows.push([
        transaksiId, timestamp, validation.data.tanggalOperasional, validation.data.shift,
        it.itemId, master['Nama_Barang'], master['Area'],
        it.step1, it.step2, it.total,
        validation.data.petugas, sesiId, it.keterangan,
        it.statusIsi || '', it.tglRefill || '', it.tglPakai || '',
        validation.data.note || '',
      ]);
    });

    // ── 1 batch write untuk 130 item ───────────────────────────────
    const startRow = soSheet.getLastRow() + 1;
    soSheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    const rowsWritten = rows.length;

    // ── Laporan PDF (opsional; SO tetap tersimpan walau PDF gagal) ──
    let laporanId = null;
    try {
      laporanId = generatePDF_(
        cabangId, spreadsheet, cabang, sesiId,
        validation.data.tanggalOperasional, validation.data.shift, validation.data.petugas,
        transaksiList, masterRows, prevInfo
      );
    } catch (err) {
      Logger.log('WARN submitSO: PDF gagal dibuat, SO tetap tersimpan. sesi=%s err=%s', sesiId, err.message);
    }

    logSORequest_({
      requestId: newRandomToken_(8), cabangId, sesiId,
      status: 'success', items_count: itemsCount,
      rows_written: rowsWritten, processing_ms: Date.now() - t0,
    });

    return {
      status: 'success',
      sesiId,
      laporanId,
      rows_written: rowsWritten,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mencari keberadaan Sesi_ID di SO_Transaksi (hanya baca kolom Sesi_ID).
 * Mengembalikan jumlah baris milik sesi tersebut + Laporan_ID bila ada.
 */
function findSesiRecord_(soSheet, sesiId) {
  const lastRow = soSheet.getLastRow();
  if (lastRow < 2) return { found: false, rows: 0, laporanId: null };

  const sesiCol = soSheet.getRange(2, SO_COL.Sesi_ID, lastRow - 1, 1).getValues();
  let rows = 0;
  for (let i = 0; i < sesiCol.length; i++) {
    if (String(sesiCol[i][0]) === sesiId) rows++;
  }
  if (rows === 0) return { found: false, rows: 0, laporanId: null };

  return { found: true, rows: rows, laporanId: findLaporanIdForSesi_(soSheet.getParent(), sesiId) };
}

function findLaporanIdForSesi_(spreadsheet, sesiId) {
  try {
    const sheet = getSheetByName_(spreadsheet, 'Laporan_PDF');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const sesiCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    const idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < sesiCol.length; i++) {
      if (String(sesiCol[i][0]) === sesiId) return String(idCol[i][0]);
    }
  } catch (err) {
    Logger.log('WARN findLaporanIdForSesi_: %s', err.message);
  }
  return null;
}

function calculateStatus_(total, threshold) {
  if (!threshold || threshold <= 0) return 'Tidak Dipantau';
  if (total <= threshold) return 'Kritis';
  if (total <= threshold * 2) return 'Hampir Habis';
  return 'Aman';
}

/**
 * Query SO sebelumnya. Tidak membaca seluruh sheet: pass ke-1 hanya
 * membaca kolom Timestamp + Sesi_ID untuk menemukan N sesi terakhir,
 * pass ke-2 membaca detail hanya pada rentang baris sesi-sesi tersebut.
 */
function getPreviousSO(cabangId) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'SO_Transaksi');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { latest: null, items: {}, history: [] };

  // Pass 1: identifikasi sesi terbaru lewat 2 kolom saja.
  const timestamps = sheet.getRange(2, SO_COL.Timestamp, lastRow - 1, 1).getValues();
  const sesiIds = sheet.getRange(2, SO_COL.Sesi_ID, lastRow - 1, 1).getValues();

  const sessions = {};
  for (let i = 0; i < sesiIds.length; i++) {
    const sid = String(sesiIds[i][0]);
    if (!sid) continue;
    const ts = new Date(timestamps[i][0] || 0).getTime() || 0;
    const row = i + 2; // baris spreadsheet (1-based)
    if (!sessions[sid]) {
      sessions[sid] = { tsTime: ts, minRow: row, maxRow: row };
    } else {
      sessions[sid].tsTime = Math.max(sessions[sid].tsTime, ts);
      sessions[sid].minRow = Math.min(sessions[sid].minRow, row);
      sessions[sid].maxRow = Math.max(sessions[sid].maxRow, row);
    }
  }

  const sorted = Object.keys(sessions)
    .map(sid => ({ sid, ...sessions[sid] }))
    .sort((a, b) => b.tsTime - a.tsTime)
    .slice(0, MAX_HISTORY_SESSIONS);

  if (sorted.length === 0) return { latest: null, items: {}, history: [] };

  // Pass 2: baca detail hanya untuk rentang baris sesi-sesi terpilih.
  const minRow = Math.min.apply(null, sorted.map(s => s.minRow));
  const maxRow = Math.max.apply(null, sorted.map(s => s.maxRow));
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const detailRows = sheet.getRange(minRow, 1, maxRow - minRow + 1, headers.length).getValues();

  const recentIds = {};
  sorted.forEach(s => { recentIds[s.sid] = true; });

  const soRows = [];
  detailRows.forEach(row => {
    const obj = {};
    headers.forEach((h, c) => { obj[h] = row[c]; });
    if (recentIds[String(obj['Sesi_ID'])]) soRows.push(obj);
  });

  // Group by Sesi_ID → history (terbaru dulu)
  const grouped = {};
  soRows.forEach(r => {
    const sid = r['Sesi_ID'];
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(r);
  });

  const history = sorted
    .filter(s => grouped[s.sid])
    .map(s => {
      const sessionRows = grouped[s.sid];
      const firstRow = sessionRows[0];
      const items = {};
      sessionRows.forEach(r => {
        items[r['Nama_Barang']] = {
          step1: Number(r['Step1']) || 0,
          step2: Number(r['Step2']) || 0,
          total: Number(r['Total']) || 0,
          tanggal: formatDate_(r['Tanggal_Operasional']),
          shift: r['Shift'] || '',
          petugas: r['Petugas'] || '',
          keterangan: r['Keterangan'] || '',
          statusIsi: r['Status_Isi'] || '',
          tglRefill: formatDate_(r['Tgl_Refill']),
          tglPakai: formatDate_(r['Tgl_Pakai']),
        };
      });
      return {
        sesiId: s.sid,
        tanggal: formatDate_(firstRow['Tanggal_Operasional']),
        shift: firstRow['Shift'],
        petugas: firstRow['Petugas'],
        items,
      };
    });

  const latestEntry = history[0] || null;
  return {
    latest: latestEntry ? {
      sesiId: latestEntry.sesiId,
      tanggal: latestEntry.tanggal,
      shift: latestEntry.shift,
      petugas: latestEntry.petugas,
    } : null,
    items: latestEntry ? latestEntry.items : {},
    history,
  };
}