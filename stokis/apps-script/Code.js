// Code.js
const API_KEY_PROP = 'STOKIS_API_KEY';

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  let body = {};
  try {
    body = e.postData ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    body = {};
  }

  const requestId = newRandomToken_(8);
  const action = body.action || (e.parameter && e.parameter.action);
  const cabangId = body.cabangId || (e.parameter && e.parameter.cabangId);
  const t0 = Date.now();

  // 1. Validasi API Key (constant-time compare; tidak ada fallback hardcoded)
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_PROP);
  const incomingKey = body['x-api-key'] || (e.parameter && e.parameter['x-api-key']);
  if (!incomingKey || !secureKeyEqual_(incomingKey, apiKey)) {
    Logger.log('SO_LOG ' + JSON.stringify({
      requestId, action, cabangId, ts: new Date().toISOString(),
      status: 'unauthorized', elapsed_ms: Date.now() - t0,
    }));
    return jsonResponse_({ success: false, error: { code: 'UNAUTHORIZED', message: 'API key tidak valid' } });
  }

  const payload = body.payload || {};

  // 2. Route Action
  try {
    const result = routeAction_(action, cabangId, payload, e.parameter || {});
    Logger.log('SO_LOG ' + JSON.stringify({
      requestId, action, cabangId, ts: new Date().toISOString(),
      status: 'success', elapsed_ms: Date.now() - t0,
    }));
    return result;
  } catch (err) {
    const code = (err && err.code) || 'server_error';
    const message = (err && err.message) ? err.message : 'Terjadi kesalahan internal';
    Logger.log('SO_LOG ' + JSON.stringify({
      requestId, action, cabangId, ts: new Date().toISOString(),
      status: 'error', code, message, elapsed_ms: Date.now() - t0,
    }));
    return jsonResponse_({ success: false, error: { code, message } });
  }
}

function routeAction_(action, cabangId, payload, params) {
  switch (action) {
    // Cabang
    case 'getCabangList':        return jsonResponse_({ success: true, data: getCabangList() });
    case 'createCabang':         return jsonResponse_({ success: true, data: createCabang(payload) });
    case 'updateCabang':         return jsonResponse_({ success: true, data: updateCabang(cabangId, payload) });
    case 'setCabangActive':      return jsonResponse_({ success: true, data: setCabangActive(cabangId, payload.aktif) });
    // Master Item
    case 'getMasterItems':       return jsonResponse_({ success: true, data: getMasterItems(cabangId) });
    case 'addItem':              return jsonResponse_({ success: true, data: addItem(cabangId, payload) });
    case 'updateThreshold':      return jsonResponse_({ success: true, data: updateThreshold(cabangId, payload.itemId, payload.threshold) });
    case 'setItemActive':        return jsonResponse_({ success: true, data: setItemActive(cabangId, payload.itemId, payload.aktif) });
    // Petugas
    case 'getPetugasList':       return jsonResponse_({ success: true, data: getPetugasList(cabangId) });
    case 'addPetugas':           return jsonResponse_({ success: true, data: addPetugas(cabangId, payload) });
    case 'updatePetugas':        return jsonResponse_({ success: true, data: updatePetugas(cabangId, payload.petugasId, payload) });
    case 'setPetugasActive':     return jsonResponse_({ success: true, data: setPetugasActive(cabangId, payload.petugasId, payload.aktif) });
    // Users (autentikasi)
    case 'login':                return jsonResponse_({ success: true, data: login(payload) });
    case 'getUsers':             return jsonResponse_({ success: true, data: getUsers(cabangId) });
    case 'addUser':              return jsonResponse_({ success: true, data: addUser(payload) });
    case 'updateUser':           return jsonResponse_({ success: true, data: updateUser(payload.userId, payload) });
    case 'setUserActive':        return jsonResponse_({ success: true, data: setUserActive(payload.userId, payload.aktif) });
    case 'deleteUser':           return jsonResponse_({ success: true, data: deleteUser(payload.userId) });
    // SO
    case 'submitSO':             return jsonResponse_({ success: true, data: submitSO(cabangId, payload) });
    case 'getPreviousSO':        return jsonResponse_({ success: true, data: getPreviousSO(cabangId) });
    // Laporan
    case 'saveLaporan':           return jsonResponse_({ success: true, data: saveLaporan(cabangId, payload) });
    case 'searchLaporan':        return jsonResponse_({ success: true, data: searchLaporan(cabangId, payload) });
    case 'getShareWhatsAppLink': return jsonResponse_({ success: true, data: getShareWhatsAppLink(cabangId, payload.laporanId) });
    case 'updateStatusKirimWA':  return jsonResponse_({ success: true, data: updateStatusKirimWA(cabangId, payload.laporanId) });
    // Dashboard
    case 'getDashboardHarian':   return jsonResponse_({ success: true, data: getDashboardHarian(cabangId, payload.tanggal) });
    case 'getDashboardMingguan': return jsonResponse_({ success: true, data: getDashboardMingguan(cabangId, payload.dari, payload.sampai) });
    // Drive Upload
    case 'uploadFileToDrive':    return jsonResponse_({ success: true, data: uploadFileToDrive(cabangId, payload) });

    default:
      throw ApiError_('invalid_action', 'Action tidak dikenal: ' + action);
  }
}

// Constant-time string comparison via digest.
function secureKeyEqual_(a, b) {
  const ha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(a || ''), Utilities.Charset.UTF_8);
  const hb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(b || ''), Utilities.Charset.UTF_8);
  if (ha.length !== hb.length) return false;
  for (let i = 0; i < ha.length; i++) {
    if (ha[i] !== hb[i]) return false;
  }
  return true;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}