// lib/domain/master-item-service.ts
// Operasi Master Item — port dari MasterItem.js.

import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, sheetToObjects, findRowIndex, appendRows, writeRow } from '@/lib/google/sheets';
import { ApiError } from './errors';
import { randomToken, buildItemId } from './ids';

import { parseThreshold } from './so';

// ── Tipe Input normalization ─────────────────────────────────

const BASE_TYPES = ['dual', 'single', 'boolean', 'date', 'text', 'expiry'];
const TWO_COMBOS = BASE_TYPES.flatMap((a) =>
  BASE_TYPES.filter((b) => b !== a && !(a === 'dual' && b === 'single') && !(a === 'single' && b === 'dual'))
    .map((b) => `${a},${b}`)
);
const ALLOWED_TIPE = new Set([...BASE_TYPES, ...TWO_COMBOS, 'dual,boolean,date']);

export function normalizeTipeInput(raw: unknown): string {
  const val = String(raw || 'dual').toLowerCase().trim();
  const parts = val.split(',').map((t) => t.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  const hasDual = unique.includes('dual');
  const cleaned = unique.filter((t) => !(t === 'single' && hasDual));
  const normalized = cleaned.join(',');
  return ALLOWED_TIPE.has(normalized) ? normalized : 'dual';
}

export interface MasterItemPayload {
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Konversi_Isi?: string;
  Konversi_Keterangan?: string;
  Threshold?: number;
  Tipe_Input?: string;
  Keterangan?: string;
}

export async function getMasterItems(cabangId: string) {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { headers, rows } = await readSheetData(spreadsheetId, 'Master_Item');
  const list = sheetToObjects(headers, rows);
  return list
    .filter((r) => r['Aktif'] === true || r['Aktif'] === 'true' || r['Aktif'] === 'TRUE' || r['Aktif'] === 'True')
    .map((r) => ({
      ...r,
      Threshold: parseThreshold(r['Threshold']),
    }));
}

export async function addItem(cabangId: string, payload: MasterItemPayload): Promise<{ itemId: string }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const itemId = buildItemId(randomToken(6));
  await appendRows(spreadsheetId, 'Master_Item', [[
    itemId,
    payload.Nama_Barang,
    payload.Area,
    payload.Satuan,
    payload.Konversi_Isi || '',
    payload.Konversi_Keterangan || '',
    parseThreshold(payload.Threshold),
    true,
    new Date(),
    payload.Tipe_Input || '',
    payload.Keterangan || '',
  ]]);
  return { itemId };
}

export async function updateThreshold(
  cabangId: string,
  itemId: string,
  threshold: unknown
): Promise<{ itemId: string; threshold: number }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Master_Item');
  const found = findRowIndex(rows, 0, itemId);
  if (found.index === -1) throw new ApiError('not_found', 'Item ' + itemId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  const th = parseThreshold(threshold);
  await writeRow(spreadsheetId, `Master_Item!G${rowNumber}`, [th ?? '']);
  return { itemId, threshold: th ?? 0 };
}

export async function setItemActive(
  cabangId: string,
  itemId: string,
  aktif: unknown
): Promise<{ itemId: string; aktif: boolean }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Master_Item');
  const found = findRowIndex(rows, 0, itemId);
  if (found.index === -1) throw new ApiError('not_found', 'Item ' + itemId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  const val = aktif === true || aktif === 'true';
  await writeRow(spreadsheetId, `Master_Item!H${rowNumber}`, [val]);
  return { itemId, aktif: val };
}

export async function updateTipeInput(
  cabangId: string,
  itemId: string,
  tipeInput: unknown
): Promise<{ itemId: string; tipeInput: string }> {
  // Generate semua kombinasi valid
  const BASE_TYPES = ['dual', 'single', 'boolean', 'date', 'text', 'expiry'];
  const TWO_COMBOS = BASE_TYPES.flatMap((a) =>
    BASE_TYPES.filter((b) => b !== a && !(a === 'dual' && b === 'single') && !(a === 'single' && b === 'dual'))
      .map((b) => `${a},${b}`)
  );
  const allowed = new Set([...BASE_TYPES, ...TWO_COMBOS, 'dual,boolean,date']);

  // Normalize: lowercase, trim, dedupe, resolve dual/single conflict
  const val = String(tipeInput || 'dual').toLowerCase().trim();
  const parts = val.split(',').map((t) => t.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  const hasDual = unique.includes('dual');
  const cleaned = unique.filter((t) => !(t === 'single' && hasDual));
  const normalized = cleaned.join(',');

  const finalVal = allowed.has(normalized) ? normalized : 'dual';
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Master_Item');
  const found = findRowIndex(rows, 0, itemId);
  if (found.index === -1) throw new ApiError('not_found', 'Item ' + itemId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  await writeRow(spreadsheetId, `Master_Item!J${rowNumber}`, [finalVal]);
  return { itemId, tipeInput: finalVal };
}

export async function updateKeterangan(
  cabangId: string,
  itemId: string,
  keterangan: unknown
): Promise<{ itemId: string; keterangan: string }> {
  const val = String(keterangan || '');
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Master_Item');
  const found = findRowIndex(rows, 0, itemId);
  if (found.index === -1) throw new ApiError('not_found', 'Item ' + itemId + ' tidak ditemukan');
  const rowNumber = found.index + 2;
  await writeRow(spreadsheetId, `Master_Item!K${rowNumber}`, [val]);
  return { itemId, keterangan: val };
}

// ── Batch update ─────────────────────────────────────────────

export interface BatchUpdateItem {
  itemId: string;
  threshold?: number;
  tipeInput?: string;
  keterangan?: string;
}

export async function batchUpdate(
  cabangId: string,
  updates: BatchUpdateItem[]
): Promise<{ updated: number }> {
  if (updates.length === 0) return { updated: 0 };

  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Master_Item');

  // Build itemId → rowIndex map
  const indexMap = new Map<string, number>();
  rows.forEach((row, i) => {
    const id = String(row[0] || '');
    if (id) indexMap.set(id, i);
  });

  let updated = 0;
  for (const u of updates) {
    const rowIdx = indexMap.get(u.itemId);
    if (rowIdx == null) continue;
    const rowNum = rowIdx + 2; // 1-indexed + header

    const writes: Promise<void>[] = [];

    if (u.threshold != null) {
      const th = parseThreshold(u.threshold);
      writes.push(writeRow(spreadsheetId, `Master_Item!G${rowNum}`, [th ?? '']));
    }
    if (u.tipeInput != null) {
      const normalized = normalizeTipeInput(u.tipeInput);
      writes.push(writeRow(spreadsheetId, `Master_Item!J${rowNum}`, [normalized]));
    }
    if (u.keterangan != null) {
      writes.push(writeRow(spreadsheetId, `Master_Item!K${rowNum}`, [u.keterangan]));
    }

    if (writes.length > 0) {
      await Promise.all(writes);
      updated++;
    }
  }

  return { updated };
}
