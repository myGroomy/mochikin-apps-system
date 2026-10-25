// lib/domain/laporan-service.ts
// Operasi laporan — port dari Laporan.js. Menggunakan Google Sheets API.

import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, readSheetDataRaw, sheetToObjects, findRowIndex, appendRows, writeRow, setCellValue, ensureSheet, columnIndexToLetter } from '@/lib/google/sheets';
import { calculateStatus, parseThreshold } from './so';
import { ApiError } from './errors';
import { randomToken, buildLaporanId, formatDate } from './ids';

interface LaporanRow {
  Laporan_ID: string;
  Sesi_ID: string;
  Tanggal_Operasional: string;
  Shift: string;
  Petugas: string;
  Link_PDF?: string;
  Link_XLSX?: string;
  Link_XLSX_FileId?: string;
  Status?: string;
}

interface SaveLaporanPayload {
  sesiId?: string;
  tanggalOperasional?: string;
  shift?: string;
  petugas?: string;
  items?: SaveLaporanItem[];
  linkPdf?: string;
  linkXlsx?: string;
  linkXlsxFileId?: string;
  note?: string;
  previousSOInfo?: { tanggal?: string; shift?: string; petugas?: string } | null;
}

interface SaveLaporanItem {
  itemId?: string;
  namaBarang?: string;
  satuan?: string;
  area?: string;
  threshold?: number;
  step1?: unknown;
  step2?: unknown;
  keterangan?: string;
  prevStep1?: number | null;
  prevStep2?: number | null;
  prevTotal?: number | null;
  prevTanggal?: string | null;
  prevShift?: string | null;
  prevKeterangan?: string;
  statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill?: string;
  tglPakai?: string;
  tglKedaluwarsa?: string;
}

/**
 * Simpan catatan laporan langsung dari payload. Idempoten per sesiId.
 * Menjamin selalu ada laporanId yang valid untuk halaman konfirmasi/share.
 */
export async function saveLaporan(
  cabangId: string,
  payload: SaveLaporanPayload
): Promise<{ status: string; sesiId: string; laporanId: string; rows_written: number }> {
  const sesiId = String((payload && payload.sesiId) || '');
  if (!sesiId) throw new ApiError('validation_error', 'sesiId wajib disertakan');

  const { spreadsheetId } = await resolveCabang(cabangId);
  const laporanRows = await readAllRows(spreadsheetId, 'Laporan_PDF');

  const existing = laporanRows.find((r) => String(r['Sesi_ID']) === sesiId);
  if (existing && existing['Laporan_ID']) {
    return {
      status: 'already_processed',
      sesiId,
      laporanId: String(existing['Laporan_ID']),
      rows_written: 0,
    };
  }

  let jumlahKritis = 0;
  let jumlahHampirHabis = 0;
  (payload.items || []).forEach((it) => {
    const total = (Number(it.step1) || 0) + (Number(it.step2) || 0);
    const threshold = parseThreshold(it.threshold);
    if (threshold === null) return;
    const s = calculateStatus(total, threshold);
    if (s === 'Kritis') jumlahKritis++;
    else if (s === 'Hampir Habis') jumlahHampirHabis++;
  });

  const laporanId = buildLaporanId(payload.tanggalOperasional || '', randomToken(8));
  const shift = payload.shift ? String(payload.shift).trim() : '';

  await appendRows(spreadsheetId, 'Laporan_PDF', [[
    laporanId,
    sesiId,
    payload.tanggalOperasional || '',
    shift,
    payload.petugas || '',
    new Date(),
    payload.linkPdf || '',
    jumlahKritis,
    jumlahHampirHabis,
    'Belum Dikirim',
  ]]);

  // Simpan baris detail laporan (perbandingan SO lama vs sekarang) ke sheet
  // Laporan_SO sebagai data riil, formatnya sama dengan tabel di PDF.
  await saveLaporanDetail(cabangId, {
    laporanId,
    tanggalOperasional: payload.tanggalOperasional || '',
    shift,
    petugas: payload.petugas || '',
    items: payload.items || [],
    note: String(payload.note || ''),
    previousSOInfo: payload.previousSOInfo || null,
  });

  return { status: 'success', sesiId, laporanId, rows_written: 1 };
}

export const LAPORAN_DETAIL_SHEET = 'Laporan_SO';

const LAPORAN_DETAIL_HEADERS = [
  'Laporan_ID', 'Tanggal_Operasional', 'Shift', 'Petugas',
  'Item_ID', 'Nama_Barang', 'Area', 'Satuan', 'Threshold',
  'Prev_Step1', 'Prev_Step2', 'Prev_Total', 'Prev_Tanggal', 'Prev_Shift', 'Prev_Keterangan',
  'Step1', 'Step2', 'Total',
  'Penggunaan', 'Keterangan', 'Status',
  'Status_Isi', 'Tgl_Refill', 'Tgl_Pakai',
  'Note',
  'Tgl_Kedaluwarsa',
];

/**
 * Peta header Laporan_SO → kolom (1-based). Dipakai untuk memastikan penulisan
 * sel di Laporan_SO selalu memakai layout yang benar (LAPORAN_DETAIL_HEADERS),
 * BUKAN SO_COL (layout SO_Transaksi). Mengembalikan null bila field tak dikenal.
 */
export function laporanDetailCol(field: string): number | null {
  const idx = LAPORAN_DETAIL_HEADERS.indexOf(field);
  return idx === -1 ? null : idx + 1;
}

/**
 * Pastikan header Laporan_SO lengkap (self-healing). Dipakai sebelum menulis
 * sel di fitur edit supaya kolom baru (mis. Tgl_Kedaluwarsa) tersedia meski
 * laporan lama belum punya kolom tersebut.
 */
export async function ensureLaporanDetailSheet(cabangId: string): Promise<void> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  await ensureSheet(spreadsheetId, LAPORAN_DETAIL_SHEET, LAPORAN_DETAIL_HEADERS);
}

async function saveLaporanDetail(
  cabangId: string,
  data: {
    laporanId: string;
    tanggalOperasional: string;
    shift: string;
    petugas: string;
    items: SaveLaporanItem[];
    note?: string;
    previousSOInfo?: { tanggal?: string; shift?: string; petugas?: string } | null;
  }
): Promise<void> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  await ensureSheet(spreadsheetId, LAPORAN_DETAIL_SHEET, LAPORAN_DETAIL_HEADERS);

  const prevTanggal = data.previousSOInfo?.tanggal || '';
  const prevShift = data.previousSOInfo?.shift || '';
  const note = String(data.note || '');

  const rows: unknown[][] = (data.items || []).map((it) => {
    const step1 = Number(it.step1) || 0;
    const step2 = Number(it.step2) || 0;
    const total = step1 + step2;
    const prevTotal = it.prevTotal != null ? Number(it.prevTotal) : null;
    const penggunaan = prevTotal != null ? total - prevTotal : null;
    const threshold = parseThreshold(it.threshold);
    const status = calculateStatus(total, threshold);
    return [
      data.laporanId,
      data.tanggalOperasional,
      data.shift,
      data.petugas,
      it.itemId || '',
      it.namaBarang || '',
      it.area || '',
      it.satuan || '',
      threshold != null ? threshold : null,
      it.prevStep1 != null ? Number(it.prevStep1) : null,
      it.prevStep2 != null ? Number(it.prevStep2) : null,
      prevTotal,
      (it.prevTanggal || prevTanggal) as string | null,
      (it.prevShift || prevShift) as string | null,
      it.prevKeterangan || '',
      step1,
      step2,
      total,
      penggunaan,
      it.keterangan || '',
      status,
      it.statusIsi || '',
      it.tglRefill || '',
      it.tglPakai || '',
      note,
      it.tglKedaluwarsa || '',
    ];
  });

  if (rows.length > 0) {
    await appendRows(spreadsheetId, LAPORAN_DETAIL_SHEET, rows);
  }
}

export async function searchLaporan(
  cabangId: string,
  params: { tanggal?: string; shift?: string; petugas?: string }
): Promise<LaporanRow[]> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  let rows = (await readAllRows(spreadsheetId, 'Laporan_PDF')) as unknown as LaporanRow[];
  if (params.tanggal) rows = rows.filter((r) => formatDate(r['Tanggal_Operasional']) === params.tanggal);
  if (params.shift) rows = rows.filter((r) => r['Shift'] === params.shift);
  if (params.petugas) rows = rows.filter((r) => r['Petugas'] === params.petugas);
  return rows;
}

export async function getShareWhatsAppLink(
  cabangId: string,
  laporanId: string
): Promise<{ waLink: string; laporan: LaporanRow }> {
  const { spreadsheetId, cabang } = await resolveCabang(cabangId);
  const rows = await readAllRows(spreadsheetId, 'Laporan_PDF');
  const laporan = rows.find((r) => String(r['Laporan_ID']) === laporanId) as LaporanRow | undefined;
  if (!laporan) throw new ApiError('not_found', 'Laporan ' + laporanId + ' tidak ditemukan');
  const nomorWA = String(cabang['Nomor_WA_Cabang'] || '').replace(/\D/g, '');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const viewLink = `${baseUrl}/laporan/view/${encodeURIComponent(laporanId)}?cabang=${encodeURIComponent(cabangId)}`;
  const teks = `Laporan SO ${cabang['Nama_Cabang'] || ''} - ${formatDate(laporan['Tanggal_Operasional'])} ${laporan['Shift']}\nLihat Laporan: ${viewLink}`;
  return { waLink: `https://wa.me/${nomorWA}?text=${encodeURIComponent(teks)}`, laporan };
}

export async function updateStatusKirimWA(
  cabangId: string,
  laporanId: string
): Promise<{ laporanId: string; status: string }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { rows } = await readSheetData(spreadsheetId, 'Laporan_PDF');
  const found = findRowIndex(rows, 0, laporanId);
  if (found.index === -1) throw new ApiError('not_found', 'Laporan ' + laporanId + ' tidak ditemukan');
  const rowNumber = found.index + 2; // 1-based, +1 utk header
  await writeRow(spreadsheetId, `Laporan_PDF!J${rowNumber}`, ['Sudah Dikirim']);
  return { laporanId, status: 'Sudah Dikirim' };
}

/**
 * Simpan link XLSX yang sudah di-upload ke Drive ke baris Laporan_PDF.
 * Kolom K = Link_XLSX (kolom ke-11, 1-based).
 *
 * Self-healing: bila header 'Link_XLSX' belum ada di sheet, kolom tersebut
 * dibuat otomatis di posisi K agar link permanen tersimpan (mencegah upload
 * berhasil tapi link tidak tercatat karena kolomnya tidak ada).
 */
export async function updateLaporanXlsxLink(
  cabangId: string,
  sesiId: string,
  laporanId: string,
  linkXlsx: string
): Promise<{ updated: boolean }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { headers, rows } = await readSheetData(spreadsheetId, 'Laporan_PDF');
  const bySesi = findRowIndex(rows, 1, sesiId);
  const targetIndex = bySesi.index !== -1 ? bySesi.index : findRowIndex(rows, 0, laporanId).index;
  if (targetIndex === -1) return { updated: false };

  let colIndex = headers.findIndex((h) => h === 'Link_XLSX');
  if (colIndex === -1) {
    // Kolom Link_XLSX belum ada → buat di posisi K (index 10) + tulis header.
    colIndex = 10;
    await setCellValue(spreadsheetId, 'Laporan_PDF!K1', 'Link_XLSX');
  }

  const rowNumber = targetIndex + 2;
  const colLetter = columnIndexToLetter(colIndex);
  await writeRow(spreadsheetId, `Laporan_PDF!${colLetter}${rowNumber}`, [linkXlsx]);
  return { updated: true };
}

/**
 * Simpan link XLSX DAN fileId ke baris Laporan_PDF.
 * Kolom K = Link_XLSX (index 10), Kolom L = Link_XLSX_FileId (index 11).
 *
 * Digunakan untuk fitur edit laporan: dengan fileId, kita bisa update file
 * yang sama di Drive tanpa membuat file baru.
 */
export async function updateLaporanXlsxLinkWithId(
  cabangId: string,
  sesiId: string,
  laporanId: string,
  linkXlsx: string,
  fileId: string
): Promise<{ updated: boolean }> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { headers, rows } = await readSheetData(spreadsheetId, 'Laporan_PDF');
  const bySesi = findRowIndex(rows, 1, sesiId);
  const targetIndex = bySesi.index !== -1 ? bySesi.index : findRowIndex(rows, 0, laporanId).index;
  if (targetIndex === -1) return { updated: false };

  // Kolom Link_XLSX (K, index 10)
  let colIndex = headers.findIndex((h) => h === 'Link_XLSX');
  if (colIndex === -1) {
    colIndex = 10;
    await setCellValue(spreadsheetId, 'Laporan_PDF!K1', 'Link_XLSX');
  }
  const rowNumber = targetIndex + 2;
  const colLetterK = columnIndexToLetter(colIndex);
  await writeRow(spreadsheetId, `Laporan_PDF!${colLetterK}${rowNumber}`, [linkXlsx]);

  // Kolom Link_XLSX_FileId (L, index 11)
  let colIdIndex = headers.findIndex((h) => h === 'Link_XLSX_FileId');
  if (colIdIndex === -1) {
    colIdIndex = 11;
    await setCellValue(spreadsheetId, 'Laporan_PDF!L1', 'Link_XLSX_FileId');
  }
  const colLetterL = columnIndexToLetter(colIdIndex);
  await writeRow(spreadsheetId, `Laporan_PDF!${colLetterL}${rowNumber}`, [fileId]);

  return { updated: true };
}

async function readAllRows(spreadsheetId: string, sheetName: string): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await readSheetData(spreadsheetId, sheetName);
  return sheetToObjects(headers, rows);
}

/**
 * Ambil data laporan dari Laporan_PDF berdasarkan Laporan_ID.
 */
export async function getLaporanById(
  cabangId: string,
  laporanId: string
): Promise<LaporanRow | null> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const rows = await readAllRows(spreadsheetId, 'Laporan_PDF');
  return (rows.find((r) => String(r['Laporan_ID']) === laporanId) as unknown as LaporanRow) || null;
}

/**
 * Ambil detail item laporan dari Laporan_SO berdasarkan Laporan_ID.
 */
export async function getLaporanDetail(
  cabangId: string,
  laporanId: string
): Promise<Record<string, unknown>[]> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const { headers, rows } = await readSheetData(spreadsheetId, LAPORAN_DETAIL_SHEET);
  const all = sheetToObjects(headers, rows);
  return all.filter((r) => String(r['Laporan_ID']) === laporanId);
}

/**
 * Ambil detail item laporan beserta nomor baris FISIK di sheet Laporan_SO.
 *
 * PENTING: Laporan_SO menyimpan banyak laporan (idempoten per sesi) dalam satu
 * sheet, jadi index di array hasil filter (`getLaporanDetail`) TIDAK sama dengan
 * nomor baris sebenarnya. Fungsi ini membaca baris mentah dan menghitung
 * `rowNumber` (1-based, baris header = 1) supaya penulisan sel di fitur edit
 * selalu tepat sasaran dan tidak menimpa baris laporan lain.
 */
export async function getLaporanDetailRows(
  cabangId: string,
  laporanId: string
): Promise<Array<{ rowNumber: number; data: Record<string, unknown> }>> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  // readSheetDataRaw mempertahankan posisi fisik baris (tidak membuang baris
  // kosong) sehingga rowNumber = index rows + 2 selalu tepat.
  const { headers, rows } = await readSheetDataRaw(spreadsheetId, LAPORAN_DETAIL_SHEET);
  const result: Array<{ rowNumber: number; data: Record<string, unknown> }> = [];
  rows.forEach((row, i) => {
    const obj = sheetToObjects(headers, [row])[0] || {};
    if (String(obj['Laporan_ID']) === laporanId) {
      result.push({ rowNumber: i + 2, data: obj });
    }
  });
  return result;
}

/**
 * Catat detail perubahan 1 item ke sheet audit Laporan_Edit_Log.
 * Satu baris per field yang berubah (value lama → value baru).
 */
export async function logLaporanEdit(
  cabangId: string,
  entry: {
    laporanId: string;
    itemId?: string;
    field: string;
    oldValue: string;
    newValue: string;
    username?: string;
    nama?: string;
    role?: string;
  }
): Promise<void> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const headers = [
    'Timestamp', 'Laporan_ID', 'Item_ID',
    'Field', 'Old_Value', 'New_Value',
    'Username', 'Nama', 'Role',
  ];
  await ensureSheet(spreadsheetId, 'Laporan_Edit_Log', headers);
  await appendRows(spreadsheetId, 'Laporan_Edit_Log', [[
    new Date().toISOString(),
    entry.laporanId,
    entry.itemId || '',
    entry.field,
    entry.oldValue,
    entry.newValue,
    entry.username || '',
    entry.nama || '',
    entry.role || '',
  ]]);
}

export interface LaporanEditLog {
  Timestamp: string;
  Laporan_ID: string;
  Item_ID: string;
  Field: string;
  Old_Value: string;
  New_Value: string;
  Username: string;
  Nama: string;
  Role: string;
}

export function canEditLaporan(
  session: { role: string; username?: string; nama?: string },
  petugas: unknown
): boolean {
  if (session.role === 'admin') return true;
  const owner = String(petugas || '').trim().toLowerCase();
  if (!owner) return false;
  return [session.nama, session.username]
    .filter(Boolean)
    .some((value) => String(value).trim().toLowerCase() === owner);
}

export async function getLaporanEditLogs(
  cabangId: string,
  laporanId: string
): Promise<LaporanEditLog[]> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  try {
    const { headers, rows } = await readSheetData(spreadsheetId, 'Laporan_Edit_Log');
    return sheetToObjects(headers, rows)
      .filter((row) => String(row['Laporan_ID'] || '') === laporanId)
      .map((row) => ({
        Timestamp: String(row['Timestamp'] || ''),
        Laporan_ID: String(row['Laporan_ID'] || ''),
        Item_ID: String(row['Item_ID'] || ''),
        Field: String(row['Field'] || ''),
        Old_Value: String(row['Old_Value'] || ''),
        New_Value: String(row['New_Value'] || ''),
        Username: String(row['Username'] || ''),
        Nama: String(row['Nama'] || ''),
        Role: String(row['Role'] || ''),
      }))
      .reverse();
  } catch {
    // Laporan lama mungkin belum memiliki sheet audit.
    return [];
  }
}

export interface SesiLiveExtra {
  note: string;
  byItemId: Record<string, { statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | ''; tglRefill?: string; tglPakai?: string }>;
}

/**
 * Fallback data live dari SO_Transaksi untuk laporan lama yang kolom
 * Status_Isi/Tgl_Refill/Tgl_Pakai/Note di Laporan_SO masih kosong.
 * Diambil dari sesi SO aslinya, lalu di-join per Item_ID.
 */
export async function getSesiLiveData(
  spreadsheetId: string,
  sesiId: string
): Promise<SesiLiveExtra> {
  if (!spreadsheetId || !sesiId) return { note: '', byItemId: {} };
  try {
    const { headers, rows } = await readSheetData(spreadsheetId, 'SO_Transaksi');
    const all = sheetToObjects(headers, rows).filter((r) => String(r['Sesi_ID']) === sesiId);
    if (all.length === 0) return { note: '', byItemId: {} };
    const byItemId: SesiLiveExtra['byItemId'] = {};
    all.forEach((r) => {
      const itemId = String(r['Item_ID'] || '').trim();
      if (!itemId) return;
      byItemId[itemId] = {
        statusIsi: (['Penuh', 'Dipakai', 'Habis'].includes(String(r['Status_Isi']))) ? r['Status_Isi'] as 'Penuh' | 'Dipakai' | 'Habis' : '',
        tglRefill: String(r['Tgl_Refill'] || ''),
        tglPakai: String(r['Tgl_Pakai'] || ''),
      };
    });
    return { note: String(all[0]['Note'] || ''), byItemId };
  } catch {
    return { note: '', byItemId: {} };
  }
}

// ---------------------------------------------------------------------------
// Settings per cabang (sheet "Settings", kolom Key/Value)
// ---------------------------------------------------------------------------

export const CABANG_SETTINGS_SHEET = 'Settings';

export type UrutanLaporan = 'Area' | 'Urutan_Input' | 'Tipe_Input';

export const URUTAN_LAPORAN_KEY = 'Urutan_Laporan';

const URUTAN_LAPORAN_VALUES: UrutanLaporan[] = ['Area', 'Urutan_Input', 'Tipe_Input'];

/** Normalisasi nilai Urutan_Laporan; nilai tidak dikenal → default 'Tipe_Input' (arsitektur laporan). */
export function normalizeUrutanLaporan(value: unknown): UrutanLaporan {
  const s = String(value ?? '').trim();
  return URUTAN_LAPORAN_VALUES.includes(s as UrutanLaporan) ? (s as UrutanLaporan) : 'Tipe_Input';
}

/** Baca semua key/value sheet Settings cabang. Aman jika sheet belum ada. */
export async function getCabangSettings(spreadsheetId: string): Promise<Record<string, string>> {
  try {
    const { headers, rows } = await readSheetData(spreadsheetId, CABANG_SETTINGS_SHEET);
    const objs = sheetToObjects(headers, rows);
    const result: Record<string, string> = {};
    objs.forEach((r) => {
      result[String(r['Key'] ?? '')] = String(r['Value'] ?? '');
    });
    return result;
  } catch {
    return {};
  }
}

/** Ambil Urutan_Laporan untuk cabang (default 'Urutan_Input'). */
export async function getUrutanLaporan(spreadsheetId: string): Promise<UrutanLaporan> {
  const settings = await getCabangSettings(spreadsheetId);
  return normalizeUrutanLaporan(settings[URUTAN_LAPORAN_KEY]);
}

/** Simpan Urutan_Laporan untuk cabang. Membuat sheet/pastikan header bila perlu. */
export async function setUrutanLaporan(spreadsheetId: string, value: UrutanLaporan): Promise<UrutanLaporan> {
  const normalized = normalizeUrutanLaporan(value);
  await ensureSheet(spreadsheetId, CABANG_SETTINGS_SHEET, ['Key', 'Value']);
  const { rows } = await readSheetData(spreadsheetId, CABANG_SETTINGS_SHEET);
  const found = findRowIndex(rows, 0, URUTAN_LAPORAN_KEY);
  if (found.index !== -1) {
    const rowNumber = found.index + 2;
    await writeRow(spreadsheetId, `${CABANG_SETTINGS_SHEET}!B${rowNumber}`, [normalized]);
  } else {
    await appendRows(spreadsheetId, CABANG_SETTINGS_SHEET, [[URUTAN_LAPORAN_KEY, normalized]]);
  }
  return normalized;
}
