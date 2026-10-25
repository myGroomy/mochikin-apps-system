// Users.js — Autentikasi & manajemen pengguna via spreadsheet Registry
//
// PIN disimpan sebagai plaintext agar konfigurasi spreadsheet tetap sederhana.

const USERS_HEADERS = ['User_ID', 'Username', 'PIN', 'Nama', 'Role', 'Cabang_ID', 'Aktif', 'Created_At'];

function getUsersSheet_() {
  return getSheetByName_(getRegistry_(), 'Users');
}

function login(payload) {
  var username = String(payload.username || '').trim().toLowerCase();
  var pin = String(payload.pin || '').trim();
  if (!username || !pin) {
    throw ApiError_('validation_error', 'Username dan PIN wajib diisi');
  }

  var sheet = getUsersSheet_();
  var rows = sheetToObjects_(sheet);
  var user = null;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r['Username']).toLowerCase() !== username) continue;
    if (r['Aktif'] === false) continue;

    var storedPin = String(r['PIN']);

    if (storedPin === pin) {
      user = r;
      break;
    }
  }

  if (!user) {
    throw ApiError_('authentication_failed', 'Username atau PIN salah');
  }

  return {
    username: user['Username'],
    nama: user['Nama'],
    role: user['Role'],
    cabangId: user['Cabang_ID'] || '',
  };
}

function getUsers(cabangId) {
  var rows = sheetToObjects_(getUsersSheet_());
  return cabangId
    ? rows.filter(function(r) { return String(r['Cabang_ID']).includes(cabangId); })
    : rows;
}

function addUser(payload) {
  if (!payload.username || !payload.pin) {
    throw ApiError_('validation_error', 'username dan pin wajib diisi');
  }
  var sheet = getUsersSheet_();
  var userId = 'USR' + newRandomToken_(8);
  sheet.appendRow([
    userId,
    String(payload.username).trim(),
    String(payload.pin),
    payload.nama || '',
    payload.role || 'petugas',
    payload.cabangId || '',
    payload.aktif !== false,
    new Date(),
  ]);
  return { userId };
}

function updateUser(userId, payload) {
  var sheet = getUsersSheet_();
  var rows = sheet.getDataRange().getValues();
  var rowIdx = rows.findIndex(function(r, i) { return i > 0 && r[0] === userId; });
  if (rowIdx === -1) throw ApiError_('not_found', 'User ' + userId + ' tidak ditemukan');

  // Kolom: B=Username(2), C=PIN(3), D=Nama(4), E=Role(5), F=Cabang_ID(6)
  var updated = rows[rowIdx].slice();
  if (payload.username !== undefined) updated[1] = String(payload.username).trim();
  if (payload.pin !== undefined) updated[2] = String(payload.pin);
  if (payload.nama !== undefined) updated[3] = payload.nama;
  if (payload.role !== undefined) updated[4] = payload.role;
  if (payload.cabangId !== undefined) updated[5] = payload.cabangId;
  sheet.getRange(rowIdx + 1, 1, 1, updated.length).setValues([updated]);
  return { userId };
}

function setUserActive(userId, aktif) {
  var sheet = getUsersSheet_();
  var rows = sheet.getDataRange().getValues();
  var rowIdx = rows.findIndex(function(r, i) { return i > 0 && r[0] === userId; });
  if (rowIdx === -1) throw ApiError_('not_found', 'User ' + userId + ' tidak ditemukan');
  sheet.getRange(rowIdx + 1, 7).setValue(aktif === true || aktif === 'true');
  return { userId: userId, aktif: aktif };
}

// Hapus permanen baris user dari sheet Users.
function deleteUser(userId) {
  var sheet = getUsersSheet_();
  var rows = sheet.getDataRange().getValues();
  var rowIdx = rows.findIndex(function(r, i) { return i > 0 && r[0] === userId; });
  if (rowIdx === -1) throw ApiError_('not_found', 'User ' + userId + ' tidak ditemukan');
  sheet.deleteRow(rowIdx + 1);
  return { userId: userId };
}