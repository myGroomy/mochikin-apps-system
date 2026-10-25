// Cabang.js

function createCabang(payload) {
  const { Nama_Cabang, Alamat, PIC_Nama, Nomor_WA_Cabang } = payload;
  if (!Nama_Cabang) throw new Error('Nama_Cabang wajib diisi');
  const registry = getRegistry_();

  // 1. Ambil Template ID
  const tmplSheet = getSheetByName_(registry, 'Template_Referensi');
  const templateId = tmplSheet.getRange(2, 1).getValue();
  if (!templateId) throw new Error('Template_Spreadsheet_ID belum diisi di Registry');

  // 2. Ambil Folder Induk
  const settings = getSettingsGlobal_();
  const parentFolderId = settings['Folder_Drive_Induk'] || PropertiesService.getScriptProperties().getProperty('FOLDER_DRIVE_INDUK');
  const parentFolder = DriveApp.getFolderById(parentFolderId);

  // 3. Salin template → spreadsheet baru
  const newFile = DriveApp.getFileById(templateId).makeCopy('SO_' + Nama_Cabang, parentFolder);
  const newSpreadsheetId = newFile.getId();

  // 4. Buat folder PDF
  const pdfFolder = parentFolder.createFolder('PDF_' + Nama_Cabang);
  const pdfFolderId = pdfFolder.getId();

  // 5. Generate Cabang_ID (unik lintas create, bukan berbasis getLastRow)
  const cabangId = buildCabangId_(newRandomToken_(6));

  // 6. Tulis ke Registry
  const daftarSheet = getSheetByName_(registry, 'Daftar_Cabang');
  daftarSheet.appendRow([
    cabangId, Nama_Cabang, Alamat || '', newSpreadsheetId, pdfFolderId,
    PIC_Nama || '', Nomor_WA_Cabang || '', true, new Date()
  ]);

  Logger.log('createCabang: %s (%s)', Nama_Cabang, cabangId);
  return { cabangId, spreadsheetId: newSpreadsheetId, folderId: pdfFolderId };
}

function updateCabang(cabangId, payload) {
  const registry = getRegistry_();
  const sheet = getSheetByName_(registry, 'Daftar_Cabang');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === cabangId);
  if (rowIdx === -1) throw new Error('Cabang ' + cabangId + ' tidak ditemukan');

  // Baca-modifikasi-tulis utuh satu baris → 1 read + 1 batch write,
  // bukan 1 write per kolom.
  const updated = rows[rowIdx].slice();
  if (payload.Nama_Cabang !== undefined) updated[1] = payload.Nama_Cabang;
  if (payload.Alamat !== undefined) updated[2] = payload.Alamat;
  if (payload.PIC_Nama !== undefined) updated[5] = payload.PIC_Nama;
  if (payload.Nomor_WA_Cabang !== undefined) updated[6] = payload.Nomor_WA_Cabang;
  sheet.getRange(rowIdx + 1, 1, 1, updated.length).setValues([updated]);
  return { updated: cabangId };
}

function setCabangActive(cabangId, aktif) {
  const registry = getRegistry_();
  const sheet = getSheetByName_(registry, 'Daftar_Cabang');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === cabangId);
  if (rowIdx === -1) throw new Error('Cabang ' + cabangId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 8).setValue(aktif === true || aktif === 'true');
  return { cabangId, aktif };
}
