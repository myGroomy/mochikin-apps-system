// Laporan.js

/**
 * Simpan catatan laporan ke sheet Laporan_PDF secara langsung dari payload,
 * terlepas dari keberhasilan generate PDF Drive. Menjamin selalu ada
 * laporanId yang valid sehingga halaman konfirmasi/berbagi tetap tampil.
 *
 * Idempoten per sesiId: jika sesi sudah punya laporan, dikembalikan laporan
 * yang sudah ada tanpa menambah baris ganda.
 *
 * @param {string} cabangId
 * @param {Object} payload - { sesiId, tanggalOperasional, shift, petugas, items, linkPdf? }
 * @returns {{status: string, sesiId: string, laporanId: string, rows_written: number}}
 */
function saveLaporan(cabangId, payload) {
  const sesiId = String(payload && payload.sesiId || '');
  if (!sesiId) throw ApiError_('validation_error', 'sesiId wajib disertakan');

  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const laporanSheet = getSheetByName_(spreadsheet, 'Laporan_PDF');

  const existing = sheetToObjects_(laporanSheet).find(r => r['Sesi_ID'] === sesiId);
  if (existing && existing['Laporan_ID']) {
    return {
      status: 'already_processed',
      sesiId,
      laporanId: existing['Laporan_ID'],
      rows_written: 0,
    };
  }

  let jumlahKritis = 0;
  let jumlahHampirHabis = 0;
  (payload.items || []).forEach(function (it) {
    const total = (Number(it.step1) || 0) + (Number(it.step2) || 0);
    const threshold = Number(it.threshold) || 0;
    if (!threshold || threshold <= 0) return;
    const s = calculateStatus_(total, threshold);
    if (s === 'Kritis') jumlahKritis++;
    else if (s === 'Hampir Habis') jumlahHampirHabis++;
  });

  const laporanId = buildLaporanId_(payload.tanggalOperasional || '', newRandomToken_(8));
  const shift = payload.shift ? String(payload.shift).trim() : '';
  laporanSheet.appendRow([
    laporanId, sesiId, payload.tanggalOperasional || '', shift,
    payload.petugas || '', new Date(), payload.linkPdf || '',
    jumlahKritis, jumlahHampirHabis, 'Belum Dikirim'
  ]);

  return {
    status: 'success',
    sesiId,
    laporanId,
    rows_written: 1,
  };
}

function searchLaporan(cabangId, params) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  let rows = sheetToObjects_(getSheetByName_(spreadsheet, 'Laporan_PDF'));
  if (params.tanggal) rows = rows.filter(r => formatDate_(r['Tanggal_Operasional']) === params.tanggal);
  if (params.shift)   rows = rows.filter(r => r['Shift'] === params.shift);
  if (params.petugas) rows = rows.filter(r => r['Petugas'] === params.petugas);
  return rows;
}

function getShareWhatsAppLink(cabangId, laporanId) {
  const { spreadsheet, cabang } = resolveCabangSpreadsheet_(cabangId);
  const rows = sheetToObjects_(getSheetByName_(spreadsheet, 'Laporan_PDF'));
  const laporan = rows.find(r => r['Laporan_ID'] === laporanId);
  if (!laporan) throw new Error('Laporan ' + laporanId + ' tidak ditemukan');
  const nomorWA = String(cabang['Nomor_WA_Cabang']).replace(/\D/g, '');
  const baseUrl = 'http://localhost:3000';
  const viewLink = baseUrl + '/laporan/view/' + encodeURIComponent(laporanId) + '?cabang=' + encodeURIComponent(cabangId);
  const teks = `Laporan SO ${cabang['Nama_Cabang']} - ${formatDate_(laporan['Tanggal_Operasional'])} ${laporan['Shift']}\nLihat Laporan: ${viewLink}`;
  return { waLink: `https://wa.me/${nomorWA}?text=${encodeURIComponent(teks)}`, laporan };
}

function updateStatusKirimWA(cabangId, laporanId) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Laporan_PDF');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === laporanId);
  if (rowIdx === -1) throw new Error('Laporan ' + laporanId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 10).setValue('Sudah Dikirim');
  return { laporanId, status: 'Sudah Dikirim' };
}
