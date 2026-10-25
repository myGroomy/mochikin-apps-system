// SetKey.js
// Set STOKIS_API_KEY ke Script Properties bila kosong. Key dihasilkan acak
// (tidak pernah hardcoded di source code).
function setDefaultApiKeyIfEmpty() {
  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty('STOKIS_API_KEY');
  if (!current) {
    props.setProperty('STOKIS_API_KEY', 'stk_' + Utilities.getUuid().replace(/-/g, ''));
    Logger.log('STOKIS_API_KEY diisi dengan key acak.');
  }
}