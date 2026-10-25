// Registry.gs

let _registryCache = null;
let _cabangCache = {};

function getRegistry_() {
  if (_registryCache) return _registryCache;
  const id = PropertiesService.getScriptProperties().getProperty('REGISTRY_SPREADSHEET_ID');
  if (!id) throw new Error('REGISTRY_SPREADSHEET_ID belum dikonfigurasi di Script Properties');
  _registryCache = SpreadsheetApp.openById(id);
  return _registryCache;
}

function resolveCabangSpreadsheet_(cabangId) {
  if (_cabangCache[cabangId]) return _cabangCache[cabangId];
  const registry = getRegistry_();
  const sheet = getSheetByName_(registry, 'Daftar_Cabang');
  const rows = sheetToObjects_(sheet);
  const cabang = rows.find(r => r['Cabang_ID'] === cabangId);
  if (!cabang) throw new Error('CABANG_TIDAK_DITEMUKAN: ' + cabangId);
  if (!cabang['Aktif']) throw new Error('CABANG_TIDAK_AKTIF: ' + cabangId);
  const ss = SpreadsheetApp.openById(cabang['Spreadsheet_ID']);
  _cabangCache[cabangId] = { spreadsheet: ss, cabang: cabang };
  return _cabangCache[cabangId];
}

function getCabangList() {
  const registry = getRegistry_();
  const sheet = getSheetByName_(registry, 'Daftar_Cabang');
  return sheetToObjects_(sheet).filter(r => r['Aktif'] === true);
}

function getSettingsGlobal_() {
  const registry = getRegistry_();
  const sheet = getSheetByName_(registry, 'Settings_Global');
  const result = {};
  sheetToObjects_(sheet).forEach(r => { result[r['Key']] = r['Value']; });
  return result;
}
