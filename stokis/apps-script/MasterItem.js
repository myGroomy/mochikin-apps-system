// MasterItem.js

function getMasterItems(cabangId) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  return sheetToObjects_(getSheetByName_(spreadsheet, 'Master_Item')).filter(r => r['Aktif'] === true);
}

function addItem(cabangId, payload) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Master_Item');
  const itemId = buildItemId_(newRandomToken_(6));
  sheet.appendRow([
    itemId, payload.Nama_Barang, payload.Area, payload.Satuan,
    payload.Konversi_Isi || '', payload.Konversi_Keterangan || '',
    Number(payload.Threshold) || 0, true, new Date(),
    payload.Tipe_Input || '',
    payload.Keterangan || '',
  ]);
  return { itemId };
}

function updateThreshold(cabangId, itemId, threshold) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Master_Item');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === itemId);
  if (rowIdx === -1) throw new Error('Item ' + itemId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 7).setValue(Number(threshold) || 0);
  return { itemId, threshold: Number(threshold) || 0 };
}

function setItemActive(cabangId, itemId, aktif) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Master_Item');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === itemId);
  if (rowIdx === -1) throw new Error('Item ' + itemId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 8).setValue(aktif === true || aktif === 'true');
  return { itemId, aktif };
}

function updateTipeInput(cabangId, itemId, tipeInput) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Master_Item');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === itemId);
  if (rowIdx === -1) throw new Error('Item ' + itemId + ' tidak ditemukan');
  const allowed = ['dual', 'single', 'boolean', 'date', 'boolean,date'];
  const val = allowed.includes(tipeInput) ? tipeInput : 'dual';
  sheet.getRange(rowIdx + 1, 10).setValue(val);
  return { itemId, tipeInput: val };
}

function updateKeterangan(cabangId, itemId, keterangan) {
  const { spreadsheet } = resolveCabangSpreadsheet_(cabangId);
  const sheet = getSheetByName_(spreadsheet, 'Master_Item');
  const rows = sheet.getDataRange().getValues();
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === itemId);
  if (rowIdx === -1) throw new Error('Item ' + itemId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 11).setValue(keterangan || '');
  return { itemId, keterangan: keterangan || '' };
}
