// lib/domain/petugas-service.ts
// Operasi Petugas — port dari Petugas.js.

import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, sheetToObjects, findRowIndex, appendRows, writeRow } from '@/lib/google/sheets';
import { ApiError } from './errors';
import { randomToken, buildPetugasId } from './ids';

export interface PetugasPayload {
  Nama: string;
  Nomor_WA?: string;
}

export async function getPetugasList(cabangId: string) {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { headers, rows } = await readSheetData(spreadsheetId, 'Petugas');
  const list = sheetToObjects(headers, rows);
  return list.filter((r) => r['Aktif'] === true || r['Aktif'] === 'true' || r['Aktif'] === 'TRUE' || r['Aktif'] === 'True');
}

export async function addPetugas(cabangId: string, payload: PetugasPayload): Promise<{ petugasId: string }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const petugasId = buildPetugasId(randomToken(6));
  await appendRows(spreadsheetId, 'Petugas', [[petugasId, payload.Nama, payload.Nomor_WA || '', true]]);
  return { petugasId };
}

export async function updatePetugas(
  cabangId: string,
  petugasId: string,
  payload: PetugasPayload
): Promise<{ petugasId: string }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Petugas');
  const found = findRowIndex(rows, 0, petugasId);
  if (found.index === -1) throw new ApiError('not_found', 'Petugas ' + petugasId + ' tidak ditemukan');
  const updated = (found.row as unknown[]).slice();
  if (payload.Nama) updated[1] = payload.Nama;
  if (payload.Nomor_WA !== undefined) updated[2] = payload.Nomor_WA;
  const rowNumber = found.index + 2;
  await writeRow(spreadsheetId, `Petugas!A${rowNumber}`, updated);
  return { petugasId };
}

export async function setPetugasActive(
  cabangId: string,
  petugasId: string,
  aktif: unknown
): Promise<{ petugasId: string; aktif: boolean }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Petugas');
  const found = findRowIndex(rows, 0, petugasId);
  if (found.index === -1) throw new ApiError('not_found', 'Petugas ' + petugasId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  const val = aktif === true || aktif === 'true';
  await writeRow(spreadsheetId, `Petugas!D${rowNumber}`, [val]);
  return { petugasId, aktif: val };
}
