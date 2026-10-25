// lib/domain/kategori-service.ts
// Operasi Kategori (Area) per-cabang — admin only.
//
// Sheet Kategori_Item (per spreadsheet cabang):
//   Kategori_ID | Nama_Kategori | Urutan | Aktif
//
// Master_Item.Area tetap disimpan sebagai teks nama kategori. Rename kategori
// = bulk-update Master_Item.Area dalam satu operasi supaya tidak ada orphan.

import { resolveCabang } from '@/lib/google/registry';
import {
  readSheetData,
  readSheetDataRaw,
  sheetToObjects,
  findRowIndex,
  appendRows,
  writeRow,
} from '@/lib/google/sheets';
import { getSheetsClient } from '@/lib/google/client';
import { ApiError } from './errors';

const KATEGORI_HEADERS = ['Kategori_ID', 'Nama_Kategori', 'Urutan', 'Aktif'];

/** Nama kategori default yang dipakai untuk seed cabang baru & backfill cabang lama. */
export const DEFAULT_KATEGORI_SEED = [
  'Meja Biru Depan',
  'Chiller',
  'Freezer Ayam dan Alat',
  'Barang Alat dan Kebersihan',
  'Meja Laci',
  'Gas dan Utilitas',
  'Area Umum',
];

export interface KategoriItem {
  Kategori_ID: string;
  Nama_Kategori: string;
  Urutan: number;
  Aktif: boolean;
}

function isTrue(v: unknown): boolean {
  return v === true || v === 'true' || v === 'TRUE' || v === 'True';
}

/** Pastikan sheet Kategori_Item ada dengan header yang benar. */
async function ensureKategoriSheet(spreadsheetId: string): Promise<void> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  const lists = (meta.data.sheets || []) as Array<{ properties?: { title?: string } }>;
  const exists = lists.some((s) => s.properties?.title === 'Kategori_Item');
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: 'Kategori_Item' } } }],
    },
  });
  await writeRow(spreadsheetId, 'Kategori_Item!A1', KATEGORI_HEADERS);
}

/**
 * Jika sheet Kategori_Item kosong, seed dari DEFAULT_KATEGORI_SEED + area yang
 * sudah terpakai di Master_Item cabang tsb (backfill cabang lama sehingga tidak
 * ada orphan / dropdown kosong). Baris pertama seed di-set aktif.
 */
export async function seedKategoriIfEmpty(spreadsheetId: string): Promise<void> {
  await ensureKategoriSheet(spreadsheetId);
  const { rows } = await readSheetData(spreadsheetId, 'Kategori_Item');
  if (rows.length > 0) return;

  const { rows: itemRows } = await readSheetData(spreadsheetId, 'Master_Item');
  const usedAreas = Array.from(
    new Set(
      itemRows
        .map((r) => String(r[2] || '').trim())
        .filter((a) => a !== '')
    )
  );

  const seedNames: string[] = [];
  DEFAULT_KATEGORI_SEED.forEach((n) => {
    if (!seedNames.includes(n)) seedNames.push(n);
  });
  usedAreas.forEach((n) => {
    if (!seedNames.includes(n)) seedNames.push(n);
  });

  const now = new Date();
  await appendRows(
    spreadsheetId,
    'Kategori_Item',
    seedNames.map((nama, idx) => [
      buildKategoriId(idx + 1),
      nama,
      idx + 1,
      true,
      now,
    ])
  );
}

/** KAT-001 … auto-generate dari nomor urut. */
export function buildKategoriId(seq: number): string {
  return 'KAT-' + String(seq).padStart(3, '0');
}

/** Baca daftar kategori sebuah cabang. includeNonaktif=false → hanya yang aktif. */
export async function getKategoriList(
  cabangId: string,
  includeNonaktif = false
): Promise<KategoriItem[]> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  await seedKategoriIfEmpty(spreadsheetId);

  const { headers, rows } = await readSheetData(spreadsheetId, 'Kategori_Item');
  const list = sheetToObjects(headers, rows) as Record<string, unknown>[];
  return list
    .filter((r) => (includeNonaktif ? true : isTrue(r['Aktif'])))
    .sort((a, b) => {
      const ua = Number(a['Urutan']) || 0;
      const ub = Number(b['Urutan']) || 0;
      if (ua !== ub) return ua - ub;
      return String(a['Nama_Kategori'] || '').localeCompare(String(b['Nama_Kategori'] || ''));
    })
    .map((r) => ({
      Kategori_ID: String(r['Kategori_ID'] || ''),
      Nama_Kategori: String(r['Nama_Kategori'] || ''),
      Urutan: Number(r['Urutan']) || 0,
      Aktif: isTrue(r['Aktif']),
    }));
}

async function assertNamaUnik(
  spreadsheetId: string,
  nama: string,
  excludeId?: string
): Promise<void> {
  const { rows } = await readSheetDataRaw(spreadsheetId, 'Kategori_Item');
  const target = String(nama || '').trim().toLowerCase();
  const dup = rows.some((r) => {
    if (excludeId && String(r[0]) === excludeId) return false;
    return String(r[1] || '').trim().toLowerCase() === target;
  });
  if (dup) {
    throw new ApiError('duplicate_kategori', 'Kategori "' + nama + '" sudah ada');
  }
}

/** Tambah kategori baru, ID auto-generate KAT-XXX. */
export async function addKategori(
  cabangId: string,
  payload: { Nama_Kategori: string; Urutan?: number }
): Promise<{ kategoriId: string }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  await seedKategoriIfEmpty(spreadsheetId);

  const { rows } = await readSheetData(spreadsheetId, 'Kategori_Item');
  const nama = String(payload.Nama_Kategori || '').trim();
  if (!nama) throw new ApiError('validation_error', 'Nama_Kategori wajib diisi');
  await assertNamaUnik(spreadsheetId, nama);

  let maxSeq = 0;
  rows.forEach((r) => {
    const m = String(r[0] || '').match(/^KAT-(\d+)$/i);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  });
  const id = buildKategoriId(maxSeq + 1);
  const urutan = payload.Urutan != null ? Number(payload.Urutan) : maxSeq + 1;

  await appendRows(spreadsheetId, 'Kategori_Item', [[
    id,
    nama,
    Number.isFinite(urutan) ? urutan : maxSeq + 1,
    true,
    new Date(),
  ]]);
  return { kategoriId: id };
}

/** Bulk-update Master_Item.Area (kolom C) dari nama lama ke nama baru. */
async function renameAreaInMasterItem(
  spreadsheetId: string,
  oldName: string,
  newName: string
): Promise<number> {
  const { rows } = await readSheetDataRaw(spreadsheetId, 'Master_Item');
  const ranges: string[] = [];
  rows.forEach((r, i) => {
    if (String(r[2] || '').trim() === String(oldName || '').trim()) {
      ranges.push(`Master_Item!C${i + 2}`);
    }
  });
  if (ranges.length === 0) return 0;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: ranges.map((range) => ({ range, values: [[newName]] })),
    },
  });
  return ranges.length;
}

/**
 * Update kategori: rename / urutan / toggle aktif.
 * Rename wajib trigger bulk-update Master_Item.Area (seluruh item yang memakai
 * nama lama ikut diubah) dalam satu operasi.
 */
export async function updateKategori(
  cabangId: string,
  kategoriId: string,
  payload: { Nama_Kategori?: string; Urutan?: number; Aktif?: boolean }
): Promise<{ kategoriId: string; updatedAreas: number }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  await seedKategoriIfEmpty(spreadsheetId);

  const { rows } = await readSheetData(spreadsheetId, 'Kategori_Item');
  const found = findRowIndex(rows, 0, kategoriId);
  if (found.index === -1) throw new ApiError('not_found', 'Kategori ' + kategoriId + ' tidak ditemukan');
  const rowNumber = found.index + 2;

  const oldName = String((found.row as unknown[])[1] || '');
  const nextName =
    payload.Nama_Kategori !== undefined
      ? String(payload.Nama_Kategori || '').trim()
      : oldName;
  if (!nextName) throw new ApiError('validation_error', 'Nama_Kategori tidak boleh kosong');

  let updatedAreas = 0;
  if (nextName !== oldName) {
    await assertNamaUnik(spreadsheetId, nextName, kategoriId);
    updatedAreas = await renameAreaInMasterItem(spreadsheetId, oldName, nextName);
  }

  const urutan =
    payload.Urutan !== undefined
      ? Number(payload.Urutan)
      : Number((found.row as unknown[])[2]) || 0;
  const aktif =
    payload.Aktif !== undefined
      ? !!payload.Aktif
      : isTrue((found.row as unknown[])[3]);

  const row: unknown[] = [
    kategoriId,
    nextName,
    Number.isFinite(urutan) ? urutan : 0,
    aktif,
  ];
  await writeRow(spreadsheetId, `Kategori_Item!A${rowNumber}`, row);
  return { kategoriId, updatedAreas };
}

/** Inisialisasi sheet Kategori_Item cabang baru (dipanggil dari createCabang). */
export async function initKategoriSheetForNewCabang(spreadsheetId: string): Promise<void> {
  await seedKategoriIfEmpty(spreadsheetId);
}