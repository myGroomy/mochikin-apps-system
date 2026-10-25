// GetKey.js
// Ambil atau buat STOKIS_API_KEY ke Script Properties.
// Tidak ada fallback hardcoded: key dihasilkan acak bila belum ada.
function getOrSetApiKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('STOKIS_API_KEY');
  if (!key) {
    key = 'stk_' + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('STOKIS_API_KEY', key);
    Logger.log('STOKIS_API_KEY dibuat baru (acak). Simpan di Vercel/Environment Variable.');
  } else {
    Logger.log('STOKIS_API_KEY sudah ada, tidak mengubah.');
  }
  return key;
}