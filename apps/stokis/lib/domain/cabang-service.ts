// lib/domain/cabang-service.ts
// Operasi cabang — port dari Cabang.js + Registry.js (getCabangList).
// Membuat cabang baru menyalin template spreadsheet + membuat folder Drive.

import { getDriveClient } from '@/lib/google/client';
import {
  getCabangList as listCabangFromRegistry,
  getSettingsGlobal,
  getTemplateSpreadsheetId,
} from '@/lib/google/registry';
import { readSheetData, appendRows, findRowIndex, writeRow } from '@/lib/google/sheets';
import { ApiError } from './errors';
import { randomToken, buildCabangId } from './ids';
import { initKategoriSheetForNewCabang } from './kategori-service';

export interface CreateCabangPayload {
  Nama_Cabang: string;
  Alamat?: string;
  PIC_Nama?: string;
  Nomor_WA_Cabang?: string;
}

export async function getCabangList() {
  return listCabangFromRegistry();
}

export async function createCabang(payload: CreateCabangPayload): Promise<{
  cabangId: string;
  spreadsheetId: string;
  folderId: string;
}> {
  const { Nama_Cabang } = payload;
  if (!Nama_Cabang) throw new ApiError('validation_error', 'Nama_Cabang wajib diisi');

  const drive = getDriveClient();

  // 1. Template ID dari Registry.
  const templateId = await getTemplateSpreadsheetId();

  // 2. Folder induk dari Settings_Global (fallback ke env).
  const settings = await getSettingsGlobal();
  const parentFolderId =
    settings['Folder_Drive_Induk'] || process.env.FOLDER_DRIVE_INDUK || '';
  if (!parentFolderId) throw new ApiError('server_error', 'Folder_Drive_Induk belum dikonfigurasi');
  await drive.files.get({ fileId: parentFolderId, fields: 'id' });

  // 3. Salin template → spreadsheet baru di folder induk.
  const copyRes = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: 'SO_' + Nama_Cabang,
      parents: [parentFolderId],
    },
  });
  const newSpreadsheetId = String(copyRes.data.id || '');

  // 4. Buat folder Drive untuk laporan cabang.
  const folderRes = await drive.files.create({
    requestBody: {
      name: 'Files_' + Nama_Cabang,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });
  const pdfFolderId = String(folderRes.data.id || '');

  // 4b. Inisialisasi sheet Kategori_Item (seed default) di spreadsheet cabang baru.
  await initKategoriSheetForNewCabang(newSpreadsheetId);

  // 5. Cabang_ID unik.
  const cabangId = buildCabangId(randomToken(6));

  // 6. Tulis ke Registry Daftar_Cabang.
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  await appendRows(registryId, 'Daftar_Cabang', [[
    cabangId,
    Nama_Cabang,
    payload.Alamat || '',
    newSpreadsheetId,
    pdfFolderId,
    payload.PIC_Nama || '',
    payload.Nomor_WA_Cabang || '',
    true,
    new Date(),
  ]]);

  return { cabangId, spreadsheetId: newSpreadsheetId, folderId: pdfFolderId };
}

export async function updateCabang(
  cabangId: string,
  payload: CreateCabangPayload
): Promise<{ updated: string }> {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  const { rows } = await readSheetData(registryId, 'Daftar_Cabang');
  const found = findRowIndex(rows, 0, cabangId);
  if (found.index === -1) throw new ApiError('not_found', 'Cabang ' + cabangId + ' tidak ditemukan');

  const updated = (found.row as unknown[]).slice();
  if (payload.Nama_Cabang !== undefined) updated[1] = payload.Nama_Cabang;
  if (payload.Alamat !== undefined) updated[2] = payload.Alamat;
  if (payload.PIC_Nama !== undefined) updated[5] = payload.PIC_Nama;
  if (payload.Nomor_WA_Cabang !== undefined) updated[6] = payload.Nomor_WA_Cabang;

  const rowNumber = found.index + 2;
  await writeRow(registryId, `Daftar_Cabang!A${rowNumber}`, updated);
  return { updated: cabangId };
}

export async function setCabangActive(
  cabangId: string,
  aktif: unknown
): Promise<{ cabangId: string; aktif: boolean }> {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  const { rows } = await readSheetData(registryId, 'Daftar_Cabang');
  const found = findRowIndex(rows, 0, cabangId);
  if (found.index === -1) throw new ApiError('not_found', 'Cabang ' + cabangId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  const val = aktif === true || aktif === 'true';
  await writeRow(registryId, `Daftar_Cabang!H${rowNumber}`, [val]);
  return { cabangId, aktif: val };
}
