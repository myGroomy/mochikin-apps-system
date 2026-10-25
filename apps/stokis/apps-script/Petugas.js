// Petugas.js

function getPetugasList(cabangId) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  return sheetToObjects_(getSheetByName_(spreadsheet, 'Petugas')).filter(r => r['Aktif'] === true);
}

function addPetugas(cabangId, payload) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Petugas');
  const petugasId = buildPetugasId_(newRandomToken_(6));
  sheet.appendRow([petugasId, payload.Nama, payload.Nomor_WA || '', true]);
  return { petugasId };
}

function updatePetugas(cabangId, petugasId, payload) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Petugas');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === petugasId);
  if (rowIdx === -1) throw new Error('Petugas ' + petugasId + ' tidak ditemukan');
  const updated = rows[rowIdx].slice();
  if (payload.Nama) updated[1] = payload.Nama;
  if (payload.Nomor_WA !== undefined) updated[2] = payload.Nomor_WA;
  sheet.getRange(rowIdx + 1, 1, 1, updated.length).setValues([updated]);
  return { petugasId };
}

function setPetugasActive(cabangId, petugasId, aktif) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Petugas');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === petugasId);
  if (rowIdx === -1) throw new Error('Petugas ' + petugasId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 4).setValue(aktif === true || aktif === 'true');
  return { petugasId, aktif };
}
