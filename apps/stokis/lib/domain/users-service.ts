// lib/domain/users-service.ts
// Autentikasi & manajemen pengguna via spreadsheet Registry — port dari Users.js.
//
import { readSheetData, sheetToObjects, findRowIndex, appendRows, writeRow, deleteRow } from '@/lib/google/sheets';
import { ApiError } from './errors';
import { randomToken } from './ids';

const USERS_SHEET = 'Users';

interface UserRow {
  User_ID: string;
  Username: string;
  PIN: string;
  Nama: string;
  Role: string;
  Cabang_ID: string;
  Aktif: boolean | string;
}

function verifyPin(pin: string, stored: string): boolean {
  return stored === pin;
}

function registryId(): string {
  const id = process.env.REGISTRY_SPREADSHEET_ID;
  if (!id) throw new ApiError('server_error', 'REGISTRY_SPREADSHEET_ID belum dikonfigurasi');
  return id;
}

async function readUsers(): Promise<UserRow[]> {
  const { headers, rows } = await readSheetData(registryId(), USERS_SHEET);
  return sheetToObjects(headers, rows) as unknown as UserRow[];
}

export interface LoginResult {
  username: string;
  nama: string;
  role: string;
  cabangId: string;
}

export async function login(payload: { username?: string; pin?: string }): Promise<LoginResult> {
  const username = String(payload.username || '').trim().toLowerCase();
  const pin = String(payload.pin || '').trim();
  if (!username || !pin) {
    throw new ApiError('validation_error', 'Username dan PIN wajib diisi');
  }

  const rows = await readUsers();

  let user: UserRow | null = null;
  for (const r of rows) {
    if (String(r['Username']).toLowerCase() !== username) continue;
    if (r['Aktif'] === false) continue;
    if (verifyPin(pin, String(r['PIN'] || ''))) {
      user = r;
      break;
    }
  }

  if (!user) throw new ApiError('authentication_failed', 'Username atau PIN salah');

  return {
    username: String(user['Username'] || ''),
    nama: String(user['Nama'] || ''),
    role: String(user['Role'] || ''),
    cabangId: String(user['Cabang_ID'] || ''),
  };
}

export async function getUsers(cabangId: string) {
  const rows = await readUsers();
  const filtered = cabangId ? rows.filter((r) => String(r['Cabang_ID']).includes(cabangId)) : rows;
  return filtered.map(({ PIN: _pin, ...user }) => user);
}

export async function addUser(payload: {
  username?: string;
  pin?: string;
  nama?: string;
  role?: string;
  cabangId?: string;
  aktif?: boolean;
}): Promise<{ userId: string }> {
  if (!payload.username || !payload.pin) {
    throw new ApiError('validation_error', 'username dan pin wajib diisi');
  }
  const userId = 'USR' + randomToken(8);
  await appendRows(registryId(), USERS_SHEET, [[
    userId,
    String(payload.username).trim(),
    String(payload.pin),
    payload.nama || '',
    payload.role || 'petugas',
    payload.cabangId || '',
    payload.aktif !== false,
    new Date(),
  ]]);
  return { userId };
}

export async function updateUser(
  userId: string,
  payload: {
    username?: string;
    pin?: string;
    nama?: string;
    role?: string;
    cabangId?: string;
  }
): Promise<{ userId: string }> {
  const { rows } = await readSheetData(registryId(), USERS_SHEET);
  const found = findRowIndex(rows, 0, userId);
  if (found.index === -1) throw new ApiError('not_found', 'User ' + userId + ' tidak ditemukan');
  const updated = (found.row as unknown[]).slice();
  if (payload.username !== undefined) updated[1] = String(payload.username).trim();
  if (payload.pin !== undefined) updated[2] = String(payload.pin);
  if (payload.nama !== undefined) updated[3] = payload.nama;
  if (payload.role !== undefined) updated[4] = payload.role;
  if (payload.cabangId !== undefined) updated[5] = payload.cabangId;
  const rowNumber = found.index + 2;
  await writeRow(registryId(), `Users!A${rowNumber}`, updated);
  return { userId };
}

export async function setUserActive(
  userId: string,
  aktif: unknown
): Promise<{ userId: string; aktif: boolean }> {
  const { rows } = await readSheetData(registryId(), USERS_SHEET);
  const found = findRowIndex(rows, 0, userId);
  if (found.index === -1) throw new ApiError('not_found', 'User ' + userId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  const val = aktif === true || aktif === 'true';
  await writeRow(registryId(), `Users!G${rowNumber}`, [val]);
  return { userId, aktif: val };
}

export async function deleteUser(userId: string): Promise<{ userId: string }> {
  const { rows } = await readSheetData(registryId(), USERS_SHEET);
  const found = findRowIndex(rows, 0, userId);
  if (found.index === -1) throw new ApiError('not_found', 'User ' + userId + ' tidak ditemukan');
  const rowNumber = found.index + 2; // +1 header, +1 1-based
  await deleteRow(registryId(), USERS_SHEET, rowNumber);
  return { userId };
}
