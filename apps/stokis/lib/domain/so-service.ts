// lib/domain/so-service.ts
// Operasi Stock Opname — port dari SO.js. Menggunakan Google Sheets API
// via lib/google/sheets.ts alih-alih SpreadsheetApp.

import { resolveCabang } from '@/lib/google/registry';
import {
  readSheetData,
  sheetToObjects,
  appendRows,
} from '@/lib/google/sheets';
import { ApiError } from './errors';
import {
  randomToken,
  buildTransaksiId,
  formatDate,
} from './ids';
import type { SOItem } from './so';

const MAX_HISTORY_SESSIONS = 8;

interface MasterItem {
  Item_ID: string;
  Nama_Barang: string;
  Area: string;
  Threshold: number;
  Aktif: boolean | string;
}

interface PrevItem {
  step1: number;
  step2: number;
  total: number;
  tanggal: string;
  shift: string;
  petugas: string;
  keterangan: string;
  waktu: string;
  statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill?: string;
  tglPakai?: string;
}

export interface PreviousSOResult {
  latest: {
    sesiId: string;
    tanggal: string;
    shift: string;
    petugas: string;
    waktu: string;
  } | null;
  items: Record<string, PrevItem>;
  history: Array<{
    sesiId: string;
    tanggal: string;
    shift: string;
    petugas: string;
    waktu: string;
    items: Record<string, PrevItem>;
  }>;
}

async function readAllRows(
  spreadsheetId: string,
  sheetName: string
): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await readSheetData(spreadsheetId, sheetName);
  return sheetToObjects(headers, rows);
}

function fmtDate(v: unknown): string {
  return formatDate(String(v ?? ''));
}

/** Format jam HH:mm dari Timestamp (ISO string / serial number). */
function fmtTime(v: unknown): string {
  const s = String(v ?? '').trim();
  const m = s.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const num = Number(s);
  if (Number.isFinite(num) && num > 0 && !/^\d{4}$/.test(s)) {
    const mins = Math.round((num - Math.floor(num)) * 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  return '';
}

async function findLaporanIdForSesi(spreadsheetId: string, sesiId: string): Promise<string | null> {
  try {
    const laporanRows = await readAllRows(spreadsheetId, 'Laporan_PDF');
    const found = laporanRows.find((r) => String(r['Sesi_ID']) === sesiId);
    return found ? String(found['Laporan_ID']) : null;
  } catch {
    return null;
  }
}

/**
 * Submit satu sesi Stock Opname. Idempoten per Sesi_ID.
 * Mengembalikan { status, sesiId, rows_written, laporanId }.
 */
export async function submitSO(
  cabangId: string,
  payload: Record<string, unknown>
): Promise<{
  status: string;
  sesiId: string;
  rows_written: number;
  laporanId: string | null;
}> {
  const { spreadsheetId } = await resolveCabang(cabangId);

  // Baca data SO utuh untuk idempotency check + prev (satu pass, lalu batch).
  const soRows = await readAllRows(spreadsheetId, 'SO_Transaksi');

  const sesiId = String(payload.sesiId || '');
  const existingIds = soRows.filter((r) => String(r['Sesi_ID']) === sesiId);
  if (existingIds.length > 0) {
    const laporanId = await findLaporanIdForSesi(spreadsheetId, sesiId);
    return { status: 'already_processed', sesiId, rows_written: 0, laporanId };
  }

  // Master item untuk enrich nama/area/threshold.
  const masterRows = (await readAllRows(spreadsheetId, 'Master_Item')) as unknown as MasterItem[];
  const masterMap: Record<string, MasterItem> = {};
  masterRows.forEach((m) => { masterMap[m.Item_ID] = m; });

  const items = (payload.items as SOItem[]) || [];
  for (const it of items) {
    if (!masterMap[it.itemId]) {
      throw new ApiError('validation_error', 'Item tidak dikenal pada master cabang: ' + it.itemId);
    }
  }

  // Data SO sebelumnya (pembanding PDF) — diambil terpisah via getPreviousSO.

  const timestamp = new Date();
  const tanggal = String(payload.tanggalOperasional || '');
  const shift = String(payload.shift || '');
  const petugas = String(payload.petugas || '');
  const note = typeof payload.note === 'string' ? payload.note.trim() : '';

  const rows: unknown[][] = [];
  items.forEach((it, idx) => {
    const master = masterMap[it.itemId];
    const transaksiId = buildTransaksiId(tanggal, idx + 1, randomToken(4));
    const step1 = Number(it.step1) || 0;
    const step2 = Number(it.step2) || 0;
    const total = Number(it.total) || (step1 + step2);
    rows.push([
      transaksiId,
      timestamp,
      tanggal,
      shift,
      it.itemId,
      master.Nama_Barang,
      master.Area,
      step1,
      step2,
      total,
      petugas,
      sesiId,
      it.keterangan,
      it.statusIsi || '',
      it.tglRefill || '',
      it.tglPakai || '',
      note,
    ]);
  });

  if (rows.length > 0) {
    await appendRows(spreadsheetId, 'SO_Transaksi', rows);
  }

  return {
    status: 'success',
    sesiId,
    rows_written: rows.length,
    laporanId: null, // diisi oleh saveLaporan secara terpisah
  };
}

/**
 * Ambil SO sebelumnya (N sesi terakhir). Tidak membaca seluruh sheet dua kali
 * penuh; membaca semua baris sekali lalu di-grup di memori.
 */
export async function getPreviousSO(cabangId: string): Promise<PreviousSOResult> {
  const { spreadsheetId } = await resolveCabang(cabangId);
  const soRows = await readAllRows(spreadsheetId, 'SO_Transaksi');

  const sessions: Record<string, { tsTime: number; minRow: number; maxRow: number }> = {};
  soRows.forEach((r, i) => {
    const sid = String(r['Sesi_ID'] || '');
    if (!sid) return;
    const ts = new Date(r['Timestamp'] as number).getTime() || 0;
    const rowIdx = i;
    if (!sessions[sid]) {
      sessions[sid] = { tsTime: ts, minRow: rowIdx, maxRow: rowIdx };
    } else {
      sessions[sid].tsTime = Math.max(sessions[sid].tsTime, ts);
      sessions[sid].minRow = Math.min(sessions[sid].minRow, rowIdx);
      sessions[sid].maxRow = Math.max(sessions[sid].maxRow, rowIdx);
    }
  });

  const sorted = Object.keys(sessions)
    .map((sid) => ({ sid, ...sessions[sid] }))
    .sort((a, b) => b.tsTime - a.tsTime)
    .slice(0, MAX_HISTORY_SESSIONS);

  if (sorted.length === 0) return { latest: null, items: {}, history: [] };

  const recentIds: Record<string, boolean> = {};
  sorted.forEach((s) => { recentIds[s.sid] = true; });

  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  soRows.forEach((r) => {
    const sid = String(r['Sesi_ID'] || '');
    if (!recentIds[sid]) return;
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(r);
  });

  const history = sorted
    .filter((s) => grouped[s.sid])
    .map((s) => {
      const sessionRows = grouped[s.sid];
      const firstRow = sessionRows[0];
      const items: Record<string, PrevItem> = {};
      sessionRows.forEach((r) => {
        const step1 = Number(r['Step1']) || 0;
        const step2 = Number(r['Step2']) || 0;
        const itemObj: PrevItem = {
          step1,
          step2,
          // Total bisa kosong di sheet → fallback hitung dari Step1+Step2.
          total: Number(r['Total']) || (step1 + step2),
          tanggal: fmtDate(r['Tanggal_Operasional']),
          shift: String(r['Shift'] || ''),
          petugas: String(r['Petugas'] || ''),
          keterangan: String(r['Keterangan'] ?? r['keterangan'] ?? r['KETERANGAN'] ?? '').trim(),
          waktu: fmtTime(r['Timestamp']),
          statusIsi: (['Penuh', 'Dipakai', 'Habis'].includes(String(r['Status_Isi']))) ? r['Status_Isi'] as 'Penuh' | 'Dipakai' | 'Habis' : '',
          tglRefill: fmtDate(r['Tgl_Refill']),
          tglPakai: fmtDate(r['Tgl_Pakai']),
        };
        const name = String(r['Nama_Barang'] || '').trim();
        const itemId = String(r['Item_ID'] || '').trim();
        if (name) items[name] = itemObj;
        if (itemId) items[itemId] = itemObj;
      });
      return {
        sesiId: s.sid,
        tanggal: fmtDate(firstRow['Tanggal_Operasional']),
        shift: String(firstRow['Shift'] ?? ''),
        petugas: String(firstRow['Petugas'] ?? ''),
        waktu: fmtTime(firstRow['Timestamp']),
        items,
      };
    });

  const latestEntry = history[0] || null;
  return {
    latest: latestEntry
      ? {
          sesiId: latestEntry.sesiId,
          tanggal: latestEntry.tanggal,
          shift: latestEntry.shift,
          petugas: latestEntry.petugas,
          waktu: latestEntry.waktu,
        }
      : null,
    items: latestEntry ? latestEntry.items : {},
    history,
  };
}
