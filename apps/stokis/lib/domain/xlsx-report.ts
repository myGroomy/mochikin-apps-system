// lib/domain/xlsx-report.ts
// Generator berkas laporan Excel (.xlsx) murni kode (in-memory) dengan ExcelJS.
// 100% self-contained tanpa dependensi berkas template di disk. Mendukung seluruh
// 6 sub-tipe laporan: regular (dual & single), utilgas, utiltoken, date, text, expiry.

import * as ExcelJS from 'exceljs';
import { parseThreshold } from './so';
import {
  getReportTypes,
  daysBetweenUtc,
  dateTypeStatus,
  expiryTypeStatus,
  type ReportItemType,
} from './report-item-type';

// ── Font config — konfigurasi font terpusat untuk berkas XLSX ────
export const XLSX_FONT = {
  family: 'Montserrat',
  title:      { size: 16 },
  info:       { size: 12 },
  groupHeader:{ size: 10 },
  colHeader:  { size: 9 },
  data:       { size: 12 },
  divider:    { size: 12 },
  note:       { size: 12 },
} as const;

export interface XlsxItem {
  itemId?: string;
  namaBarang?: string;
  area?: string;
  satuan?: string;
  threshold?: number;
  step1?: number;
  step2?: number;
  keterangan?: string;
  prevStep1?: number | string | null;
  prevStep2?: number | string | null;
  prevTotal?: number | string | null;
  prevKeterangan?: string;
  statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill?: string;
  tglPakai?: string;
  /** Tanggal kedaluwarsa untuk tipe expiry */
  tglKedaluwarsa?: string;
  tipeInput?: string;
}

export interface XlsxReportInput {
  laporanId: string;
  cabangNama: string;
  cabangKode: string;
  tanggalOperasional: string;
  shift: string;
  petugas: string;
  items: XlsxItem[];
  groupMode?: 'area' | 'kategori';
  note?: string;
  previousSOInfo?: {
    tanggal?: string;
    shift?: string;
    petugas?: string;
  } | null;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDateShort(date: string | number | null | undefined): string {
  const v = normalizeDate(date);
  if (!v) return '-';
  const day = String(v.getUTCDate()).padStart(2, '0');
  const month = String(v.getUTCMonth() + 1).padStart(2, '0');
  const year = v.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeDate(date: string | number | null | undefined): Date | null {
  if (date == null || date === '') return null;
  if (typeof date === 'number' && Number.isFinite(date)) {
    const ms = Math.round((date - 25569) * 86400000);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms);
  }
  const s = String(date).trim();
  if (/^\d{5,6}$/.test(s)) {
    const ms = Math.round((Number(s) - 25569) * 86400000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function regularStatus(s1: number, s2: number, threshold: number | null): string {
  const total = s1 + s2;
  if (threshold == null || threshold <= 0) return '—';
  if (total <= threshold) return '🔴 KRITIS';
  if (total <= threshold * 2) return '🟠 HAMPIR HABIS';
  return '🟢 AMAN';
}

function utilTokenStatus(val: string | number | null | undefined, threshold: number | null): string {
  const v = Number(val) || 0;
  if (threshold == null || threshold <= 0) return '—';
  if (v <= threshold) return '🔴 KRITIS';
  if (v <= threshold * 2) return '🟠 HAMPIR HABIS';
  return '🟢 AMAN';
}

function regularStatusRank(s1: number, s2: number, threshold: number | null): number {
  const total = s1 + s2;
  if (threshold == null || threshold <= 0) return 3;
  if (total <= threshold) return 0;
  if (total <= threshold * 2) return 1;
  return 2;
}

function utilgasStatusRank(statusIsi: string): number {
  const s = (statusIsi || '').toLowerCase();
  if (s === 'habis') return 0;
  if (s === 'dipakai') return 1;
  if (s === 'penuh') return 2;
  return 3;
}

function dateStatusRank(hariBerlalu: number | null, threshold: number | null): number {
  if (hariBerlalu == null || threshold == null || threshold <= 0) return 3;
  if (hariBerlalu >= threshold) return 0;
  if (hariBerlalu >= threshold * 0.7) return 1;
  return 2;
}

function expiryStatusRank(sisaHari: number | null, threshold: number | null): number {
  if (sisaHari == null || threshold == null || threshold <= 0) return 3;
  if (sisaHari <= threshold) return 0;
  return 2;
}

// ── Column headers ────────────────────────────────────────────────────────────

const REGULAR_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'STEP 1\nUTUH', 'STEP 2\nTERBUKA', 'TOTAL',
  'STEP 1\nUTUH\n', 'STEP 2\nTERBUKA\n', 'TOTAL 2',
  'PEMAKAIAN', 'STATUS\nSTOK', 'KETERANGAN',
];

const GAS_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'STATUS ISI', 'STATUS ISI\n', 'TGL REFILL',
  'TGL REFILL\n', 'TGL PAKAI', 'STATUS AKHIR',
  'STATUS', 'KETERANGAN', 'KETERANGAN 2',
];

const TOKEN_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'SISA AWAL', 'TGL REFILL', 'TGL REFILL\n',
  'SISA AKHIR', 'TGL PAKAI', 'PEMAKAIAN',
  'STATUS\nSTOK', 'KETERANGAN', 'KETERANGAN 2',
];

const DATE_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'TGL TERCATAT', 'HARI BERLALU', 'STATUS\nSTOK', 'KETERANGAN',
  '', '', '', '', '',
];

const TEXT_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'KETERANGAN / CATATAN',
  '', '', '', '', '', '', '', '', '',
];

const EXPIRY_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'TGL KEDALUWARSA',
  'SISA HARI', 'STATUS\nSTOK', 'KETERANGAN', '',
  '', '', '', '', '',
];

// ── Data row types ────────────────────────────────────────────────────────────

interface DataRowBase {
  no: number;
  nama?: string;
  satuan?: string;
  threshold?: number | string;
  keterangan?: string;
}

interface DataRowDual extends DataRowBase {
  type: 'item';
  prevS1?: number | null;
  prevS2?: number | null;
  prevTotal?: number | null;
  s1?: number;
  s2?: number;
  isSingle?: boolean;
}

interface DataRowBoolean extends DataRowBase {
  type: 'utilgas';
  statusIsi?: string;
  tglRefill?: string;
  tglPakai?: string;
}

interface DataRowToken extends DataRowBase {
  type: 'utiltoken';
  prevS1?: number | string | null;
  prevS2?: number | string | null;
  tglRefill?: string;
  tglPakai?: string;
}

interface DataRowDate extends DataRowBase {
  type: 'itemdate';
  tglTercatat?: string;
  hariBerlalu?: number | null;
}

interface DataRowText extends DataRowBase {
  type: 'itemtext';
}

interface DataRowExpiry extends DataRowBase {
  type: 'itemexpiry';
  tglKedaluwarsa?: string;
  sisaHari?: number | null;
}

type DataRow = DataRowDual | DataRowBoolean | DataRowToken | DataRowDate | DataRowText | DataRowExpiry;

interface Block {
  name: string;
  items: DataRow[];
  headerType: 'regular' | 'utilgas' | 'utiltoken' | 'date' | 'text' | 'expiry';
  isFirstInArea?: boolean;
  areaName?: string;
}

const THIN_BORDER = {
  top: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  left: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

function applyBordersToRow(row: ExcelJS.Row, numCols = 13): void {
  for (let c = 1; c <= numCols; c++) {
    row.getCell(c).border = THIN_BORDER;
  }
}

// ── Generator Utama ───────────────────────────────────────────────────────────

export async function generateXlsxReport(
  input: XlsxReportInput
): Promise<{ buffer: Buffer; fileName: string }> {

  // 1. Format nama file
  const kode = (input.cabangKode || 'CBG').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const d = normalizeDate(input.tanggalOperasional);
  const tgl = d
    ? `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`
    : String(input.tanggalOperasional || '');
  const shiftLabel = (input.shift || 'SO').toUpperCase();
  const petugasLabel = String(input.petugas || 'Petugas').replace(/[/\\:*?"<>|]/g, '').trim();
  const fileName = `${kode} - ${tgl} - ${shiftLabel} - ${petugasLabel}.xlsx`;

  // 2. Buat workbook in-memory dari nol (tanpa baca disk template)
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('SO DETAILS', {
    views: [{ state: 'normal', showGridLines: true }],
  });

  // Lebar 13 kolom standar format Mochikin
  ws.columns = [
    { width: 7.88 },   // A: No
    { width: 27.63 },  // B: Nama Barang
    { width: 13.63 },  // C: Satuan
    { width: 12.63 },  // D: Threshold
    { width: 19.13 },  // E: Step 1 / Prev
    { width: 15.5 },   // F: Step 2 / Prev
    { width: 11.13 },  // G: Total Prev
    { width: 16.25 },  // H: Step 1 Now
    { width: 15.13 },  // I: Step 2 Now
    { width: 12.25 },  // J: Total Now
    { width: 17.63 },  // K: Pemakaian
    { width: 20.88 },  // L: Status Stok
    { width: 28.5 },   // M: Keterangan
  ];

  // 3. Metadata header laporan
  const currTgl = formatDateShort(input.tanggalOperasional);
  const prevTgl = formatDateShort(input.previousSOInfo?.tanggal);
  const prevShift = input.previousSOInfo?.shift || '-';
  const prevPetugas = input.previousSOInfo?.petugas || '-';
  const cabangLabel = input.cabangKode + ' (' + input.cabangNama + ')';
  const note = String(input.note || '').trim();

  // ── ROW 1: Judul Laporan ──
  const row1 = ws.insertRow(1, ['', '', '', '', `LAPORAN STOCK OPNAME HARIAN ${input.cabangNama.toUpperCase()}`]);
  ws.mergeCells('E1:J1');
  row1.getCell(5).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.title.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  row1.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  // ── ROW 2: Header Komparasi SO ──
  const row2 = ws.insertRow(2, ['', '', '', '', 'SO SEBELUMNYA', '', '', 'SO SEKARANG']);
  ws.mergeCells('E2:G2');
  ws.mergeCells('H2:J2');
  row2.getCell(5).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF1E293B' } } as ExcelJS.Font;
  row2.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  row2.getCell(8).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF1E293B' } } as ExcelJS.Font;
  row2.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // ── ROW 3: Info Detail Cabang, Shift, Petugas ──
  const row3 = ws.insertRow(3, [
    cabangLabel, '', currTgl, input.shift, input.petugas, input.shift, '',
    cabangLabel, '', prevTgl, prevShift, prevPetugas, '',
  ]);
  ws.mergeCells('A3:B3');
  ws.mergeCells('F3:G3');
  ws.mergeCells('H3:I3');
  ws.mergeCells('L3:M3');
  applyBordersToRow(row3, 13);
  for (const c of [1, 3, 4, 5, 6, 8, 10, 11, 12]) {
    row3.getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
    row3.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.getRow(3).height = 24;

  // ── ROW 4: Header Grup Kolom ──
  const row4 = ws.insertRow(4, ['', '', '', 'INFORMASI BARANG', '', '', '', '', '', '', '', 'HASIL ANALISIS']);
  ws.mergeCells('A4:D4');
  ws.mergeCells('K4:M4');
  row4.getCell(1).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: 'FFFFFFFF' } } as ExcelJS.Font;
  row4.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } } as ExcelJS.Fill;
  row4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  row4.getCell(11).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: 'FFFFFFFF' } } as ExcelJS.Font;
  row4.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } } as ExcelJS.Fill;
  row4.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
  applyBordersToRow(row4, 13);
  ws.getRow(4).height = 24;

  // 4. Pengelompokan Item per Area dan per ReportItemType
  const areaOrder: string[] = [];
  const itemsByArea: Record<string, XlsxItem[]> = {};

  (input.items || []).forEach((it) => {
    const area = (it.area || '').trim() || 'Area Umum';
    if (!itemsByArea[area]) {
      itemsByArea[area] = [];
      areaOrder.push(area);
    }
    itemsByArea[area].push(it);
  });

  const today = normalizeDate(input.tanggalOperasional) || new Date();
  const blocks: Block[] = [];
  let globalNo = 0;

  areaOrder.forEach((areaKey) => {
    const areaItems = itemsByArea[areaKey] || [];
    let isFirstBlock = true;

    // Sub-grup dalam tiap area
    const subGroups: Record<string, XlsxItem[]> = {
      regular: [],
      utilgas: [],
      utiltoken: [],
      date: [],
      text: [],
      expiry: [],
    };

    areaItems.forEach((it) => {
      const types = getReportTypes(it.tipeInput);
      types.forEach((t) => {
        if (t === 'dual' || t === 'single') subGroups.regular.push(it);
        else if (t === 'boolean') subGroups.utilgas.push(it);
        else if (t === 'date') subGroups.date.push(it);
        else if (t === 'text') subGroups.text.push(it);
        else if (t === 'expiry') subGroups.expiry.push(it);
      });
    });

    const subKeys: Array<keyof typeof subGroups> = ['regular', 'utilgas', 'utiltoken', 'date', 'text', 'expiry'];

    subKeys.forEach((subKey) => {
      const subItems = subGroups[subKey];
      if (!subItems || subItems.length === 0) return;

      const blockItems: DataRow[] = [];
      const headerType = subKey;

      if (subKey === 'regular') {
        const sorted = [...subItems].sort((a, b) => {
          const s1a = Number(a.step1) || 0;
          const s2a = Number(a.step2) || 0;
          const s1b = Number(b.step1) || 0;
          const s2b = Number(b.step2) || 0;
          return regularStatusRank(s1a, s2a, parseThreshold(a.threshold)) -
                 regularStatusRank(s1b, s2b, parseThreshold(b.threshold));
        });

        sorted.forEach((it) => {
          globalNo++;
          const primary = getReportTypes(it.tipeInput)[0] || 'dual';
          const s1 = Number(it.step1) || 0;
          const s2 = Number(it.step2) || 0;
          const threshold = parseThreshold(it.threshold);
          const thresholdVal = threshold != null ? threshold : '';
          const p1 = it.prevStep1 != null && it.prevStep1 !== '' ? Number(it.prevStep1) : null;
          const p2 = it.prevStep2 != null && it.prevStep2 !== '' ? Number(it.prevStep2) : null;
          const prevTotal = (p1 != null || p2 != null)
            ? (p1 || 0) + (p2 || 0)
            : (it.prevTotal != null && it.prevTotal !== '' ? Number(it.prevTotal) : null);

          blockItems.push({
            type: 'item',
            no: globalNo,
            nama: it.namaBarang,
            satuan: it.satuan,
            threshold: thresholdVal,
            prevS1: p1,
            prevS2: p2,
            prevTotal,
            s1,
            s2,
            keterangan: it.keterangan,
            isSingle: primary === 'single',
          } as DataRowDual);
        });
      } else if (subKey === 'utilgas') {
        const sorted = [...subItems].sort((a, b) =>
          utilgasStatusRank(a.statusIsi || '') - utilgasStatusRank(b.statusIsi || '')
        );
        sorted.forEach((it) => {
          globalNo++;
          const threshold = parseThreshold(it.threshold);
          blockItems.push({
            type: 'utilgas',
            no: globalNo,
            nama: it.namaBarang,
            satuan: it.satuan,
            threshold: threshold != null ? threshold : '',
            statusIsi: it.statusIsi || '',
            tglRefill: it.tglRefill,
            tglPakai: it.tglPakai,
            keterangan: it.keterangan,
          } as DataRowBoolean);
        });
      } else if (subKey === 'date') {
        const withDays = subItems.map((it) => {
          const from = normalizeDate(it.tglRefill);
          const hariBerlalu = daysBetweenUtc(from, today);
          const th = parseThreshold(it.threshold);
          return { it, hariBerlalu, rank: dateStatusRank(hariBerlalu, th) };
        });
        withDays.sort((a, b) => a.rank - b.rank);

        withDays.forEach(({ it, hariBerlalu }) => {
          globalNo++;
          const threshold = parseThreshold(it.threshold);
          blockItems.push({
            type: 'itemdate',
            no: globalNo,
            nama: it.namaBarang,
            satuan: it.satuan,
            threshold: threshold != null ? threshold : '',
            tglTercatat: it.tglRefill || '',
            hariBerlalu,
            keterangan: it.keterangan,
          } as DataRowDate);
        });
      } else if (subKey === 'text') {
        subItems.forEach((it) => {
          globalNo++;
          blockItems.push({
            type: 'itemtext',
            no: globalNo,
            nama: it.namaBarang,
            satuan: it.satuan,
            keterangan: it.keterangan,
          } as DataRowText);
        });
      } else if (subKey === 'expiry') {
        const withRemaining = subItems.map((it) => {
          const exp = normalizeDate(it.tglKedaluwarsa);
          const sisaHari = daysBetweenUtc(today, exp);
          const th = parseThreshold(it.threshold);
          return { it, sisaHari, rank: expiryStatusRank(sisaHari, th) };
        });
        withRemaining.sort((a, b) => a.rank - b.rank);

        withRemaining.forEach(({ it, sisaHari }) => {
          globalNo++;
          const threshold = parseThreshold(it.threshold);
          blockItems.push({
            type: 'itemexpiry',
            no: globalNo,
            nama: it.namaBarang,
            satuan: it.satuan,
            threshold: threshold != null ? threshold : '',
            tglKedaluwarsa: it.tglKedaluwarsa || '',
            sisaHari,
            keterangan: it.keterangan,
          } as DataRowExpiry);
        });
      }

      blocks.push({
        name: areaKey || 'Area',
        items: blockItems,
        headerType: headerType as Block['headerType'],
        isFirstInArea: isFirstBlock,
        areaName: areaKey,
      });
      isFirstBlock = false;
    });
  });

  // 5. Tulis Blok-Blok Data ke Worksheet
  interface BlockInfo {
    block: Block;
    headerRow: number;
    firstDataRow: number;
    lastDataRow: number;
  }
  const blockInfos: BlockInfo[] = [];
  let currentRow = 5;

  blocks.forEach((block) => {
    // Divider Area
    if (block.isFirstInArea && block.areaName) {
      const row = ws.getRow(currentRow);
      row.getCell(1).value = '';
      row.getCell(2).value = `▶  ${block.areaName}`;
      for (let c = 3; c <= 13; c++) row.getCell(c).value = '';
      row.getCell(2).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.divider.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } } as ExcelJS.Fill;
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      ws.mergeCells(`B${currentRow}:M${currentRow}`);
      row.height = 18;
      applyBordersToRow(row, 13);
      currentRow++;
    }

    // Header baris per sub-tipe
    const headers = block.headerType === 'regular' ? REGULAR_HEADERS
      : block.headerType === 'utilgas' ? GAS_HEADERS
      : block.headerType === 'utiltoken' ? TOKEN_HEADERS
      : block.headerType === 'date' ? DATE_HEADERS
      : block.headerType === 'text' ? TEXT_HEADERS
      : EXPIRY_HEADERS;

    const headerRow = currentRow;
    const hRow = ws.getRow(currentRow);
    for (let c = 1; c <= 13; c++) {
      hRow.getCell(c).value = headers[c - 1];
      hRow.getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.colHeader.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
      hRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as ExcelJS.Fill;
      hRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      hRow.getCell(c).border = THIN_BORDER;
    }
    hRow.height = 28;
    currentRow++;

    // Baris-baris data
    const firstDataRow = currentRow;
    block.items.forEach((dr) => {
      const r = currentRow;
      const row = ws.getRow(r);

      if (dr.type === 'item') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const s1 = Number(dr.s1) || 0;
        const s2 = Number(dr.s2) || 0;
        const total = s1 + s2;
        const hasPrev = dr.prevTotal != null && dr.prevTotal !== '';
        const pemakaian = hasPrev ? (total - Number(dr.prevTotal)) : 0;
        const statusStr = regularStatus(s1, s2, th);

        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.threshold ?? '';

        if (dr.isSingle) {
          row.getCell(5).value = total;
          for (let c = 6; c <= 9; c++) row.getCell(c).value = '';
          ws.mergeCells(`E${r}:I${r}`);
          row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          row.getCell(5).value = dr.prevS1 ?? '';
          row.getCell(6).value = dr.prevS2 ?? '';
          row.getCell(7).value = dr.prevTotal ?? '';
          row.getCell(8).value = s1;
          row.getCell(9).value = s2;
        }

        row.getCell(10).value = total;
        row.getCell(11).value = pemakaian;
        row.getCell(12).value = statusStr;
        row.getCell(13).value = dr.keterangan || '';

        let bgColor = 'FFFFFFFF';
        let textColor = 'FF1E293B';
        if (th != null && th > 0) {
          if (total <= th) { bgColor = 'FFFEE2E2'; textColor = 'FFB91C1C'; }
          else if (total <= th * 2) { bgColor = 'FFFEF9C3'; textColor = 'FFA16207'; }
          else { bgColor = 'FFD1FAE5'; textColor = 'FF047857'; }
        }
        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: [1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c) ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        row.getCell(10).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        row.getCell(11).numFmt = '+0;-0;0';
        row.getCell(12).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: textColor } } as ExcelJS.Font;
        row.height = 18;

      } else if (dr.type === 'utilgas') {
        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.threshold ?? '';
        row.getCell(5).value = dr.statusIsi || '';
        row.getCell(6).value = dr.statusIsi || '';
        row.getCell(7).value = dr.tglRefill || '';
        row.getCell(8).value = dr.tglRefill || '';
        row.getCell(9).value = dr.tglPakai || '';
        row.getCell(10).value = dr.statusIsi === 'Penuh' ? 'Penuh' : dr.statusIsi === 'Dipakai' ? 'Dipakai' : 'Habis';
        row.getCell(11).value = '';
        row.getCell(12).value = dr.keterangan || '';
        row.getCell(13).value = '';

        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: [1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c) ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        [5, 8, 10].forEach((c) => {
          row.getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        });
        row.height = 18;

      } else if (dr.type === 'utiltoken') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const p1 = Number(dr.prevS1) || 0;
        const p2 = Number(dr.prevS2) || 0;
        const pemakaian = (p1 > 0 || p2 > 0) ? p2 - p1 : '';
        const statusStr = utilTokenStatus(dr.prevS2, th);

        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.threshold ?? '';
        row.getCell(5).value = dr.prevS1 ?? '';
        row.getCell(6).value = dr.tglRefill || '';
        row.getCell(7).value = dr.tglRefill || '';
        row.getCell(8).value = dr.prevS2 ?? '';
        row.getCell(9).value = dr.tglPakai || '';
        row.getCell(10).value = pemakaian;
        row.getCell(11).value = statusStr;
        row.getCell(12).value = dr.keterangan || '';
        row.getCell(13).value = '';

        let bgColor = 'FFFFFFFF';
        if (th != null && th > 0) {
          const val = Number(dr.prevS2) || 0;
          if (val <= th) bgColor = 'FFFEE2E2';
          else if (val <= th * 2) bgColor = 'FFFEF9C3';
          else bgColor = 'FFD1FAE5';
        }
        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: [1, 4, 5, 6, 7, 8, 9, 10, 11].includes(c) ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        [5, 8, 10].forEach((c) => {
          row.getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        });
        row.getCell(10).numFmt = '+0;-0;0';
        row.height = 18;

      } else if (dr.type === 'itemdate') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const hariBerlalu = dr.hariBerlalu ?? null;
        const statusStr = dateTypeStatus(hariBerlalu, th);

        let bgColor = 'FFFFFFFF';
        let textColor = 'FF1E293B';
        if (th != null && th > 0 && hariBerlalu != null) {
          if (hariBerlalu >= th) { bgColor = 'FFFEE2E2'; textColor = 'FFB91C1C'; }
          else if (hariBerlalu >= th * 0.7) { bgColor = 'FFFEF9C3'; textColor = 'FFA16207'; }
          else { bgColor = 'FFD1FAE5'; textColor = 'FF047857'; }
        }

        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.threshold ?? '';
        row.getCell(5).value = formatDateShort(dr.tglTercatat);
        row.getCell(6).value = hariBerlalu != null ? hariBerlalu : '';
        row.getCell(7).value = statusStr;
        row.getCell(8).value = dr.keterangan || '';
        for (let c = 9; c <= 13; c++) row.getCell(c).value = '';
        ws.mergeCells(`I${r}:M${r}`);

        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: [1, 4, 5, 6].includes(c) ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        row.getCell(7).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: textColor } } as ExcelJS.Font;
        row.height = 18;

      } else if (dr.type === 'itemtext') {
        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.keterangan || '';
        for (let c = 5; c <= 13; c++) row.getCell(c).value = '';
        ws.mergeCells(`E${r}:M${r}`);

        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: c === 1 ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        row.height = 18;

      } else if (dr.type === 'itemexpiry') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const sisaHari = dr.sisaHari ?? null;
        const statusStr = expiryTypeStatus(sisaHari, th);

        let bgColor = 'FFFFFFFF';
        let textColor = 'FF1E293B';
        if (th != null && th > 0 && sisaHari != null) {
          if (sisaHari <= th) { bgColor = 'FFFEE2E2'; textColor = 'FFB91C1C'; }
          else { bgColor = 'FFD1FAE5'; textColor = 'FF047857'; }
        }

        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = formatDateShort(dr.tglKedaluwarsa);
        row.getCell(5).value = sisaHari != null ? sisaHari : '';
        row.getCell(6).value = statusStr;
        row.getCell(7).value = dr.keterangan || '';
        for (let c = 8; c <= 13; c++) row.getCell(c).value = '';
        ws.mergeCells(`H${r}:M${r}`);

        for (let c = 1; c <= 13; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
          row.getCell(c).alignment = {
            horizontal: [1, 4, 5].includes(c) ? 'center' : 'left',
            vertical: 'middle', wrapText: true,
          };
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        }
        row.getCell(6).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: textColor } } as ExcelJS.Font;
        row.height = 18;
      }

      currentRow++;
    });

    const lastDataRow = currentRow - 1;
    blockInfos.push({ block, headerRow, firstDataRow, lastDataRow });

    // Baris kosong pemisah antar blok
    for (let i = 0; i < 2; i++) {
      const emptyRow = ws.getRow(currentRow);
      for (let c = 1; c <= 13; c++) emptyRow.getCell(c).value = '';
      emptyRow.height = 15;
      currentRow++;
    }
  });

  // 6. Bagian Keterangan / Catatan Umum Laporan
  if (note) {
    const noteHeaderRow = ws.getRow(currentRow);
    noteHeaderRow.getCell(1).value = 'KETERANGAN / CATATAN:';
    ws.mergeCells(`A${currentRow}:M${currentRow}`);
    noteHeaderRow.getCell(1).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.note.size, color: { argb: 'FFFFFFFF' } } as ExcelJS.Font;
    noteHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } } as ExcelJS.Fill;
    noteHeaderRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    applyBordersToRow(noteHeaderRow, 13);
    noteHeaderRow.height = 18;
    currentRow++;

    const noteContentRow = ws.getRow(currentRow);
    noteContentRow.getCell(1).value = note;
    ws.mergeCells(`A${currentRow}:M${currentRow}`);
    noteContentRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    noteContentRow.getCell(1).font = { name: XLSX_FONT.family, size: XLSX_FONT.note.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
    applyBordersToRow(noteContentRow, 13);
    noteContentRow.height = 60;
    currentRow++;
  }

  // 7. Tabel Excel (Filter buttons per blok)
  const regularColNames = REGULAR_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const gasColNames = GAS_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const tokenColNames = TOKEN_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const dateColNames = DATE_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const textColNames = TEXT_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const expiryColNames = EXPIRY_HEADERS.map(h => h.replace(/\n/g, ' ').trim());

  function dedupeColNames(names: string[]): string[] {
    const seen = new Map<string, number>();
    return names.map((n) => {
      const base = n || '-';
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}_${count}`;
    });
  }

  blockInfos.forEach((info, idx) => {
    const { block, headerRow, firstDataRow, lastDataRow } = info;
    if (firstDataRow > lastDataRow) return;

    const rawColNames = block.headerType === 'regular' ? regularColNames
      : block.headerType === 'utilgas' ? gasColNames
      : block.headerType === 'utiltoken' ? tokenColNames
      : block.headerType === 'date' ? dateColNames
      : block.headerType === 'text' ? textColNames
      : expiryColNames;

    const colNames = dedupeColNames(rawColNames);
    const tableName = `SO_Tabel_${idx + 1}`;
    const tableRef = `A${headerRow}:M${lastDataRow}`;

    const rows = block.items.map((dr): (string | number | null)[] => {
      if (dr.type === 'item') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const s1 = Number(dr.s1) || 0;
        const s2 = Number(dr.s2) || 0;
        const total = s1 + s2;
        const hasPrev = dr.prevTotal != null && dr.prevTotal !== '';
        const pemakaian = hasPrev ? (total - Number(dr.prevTotal)) : 0;
        const statusStr = regularStatus(s1, s2, th);
        if (dr.isSingle) {
          return [
            dr.no ?? null, dr.nama || '', dr.satuan || '', dr.threshold ?? null,
            total, null, null, null, null,
            total, pemakaian, statusStr, dr.keterangan || '',
          ];
        }
        return [
          dr.no ?? null, dr.nama || '', dr.satuan || '', dr.threshold ?? null,
          dr.prevS1 ?? null, dr.prevS2 ?? null, dr.prevTotal ?? null,
          s1, s2, total, pemakaian, statusStr, dr.keterangan || '',
        ];
      }
      if (dr.type === 'utilgas') {
        return [
          dr.no ?? null, dr.nama || '', dr.satuan || '', dr.threshold ?? null,
          dr.statusIsi || '', dr.statusIsi || '', dr.tglRefill || '',
          dr.tglRefill || '', dr.tglPakai || '',
          dr.statusIsi === 'Penuh' ? 'Penuh' : dr.statusIsi === 'Dipakai' ? 'Dipakai' : 'Habis',
          '', dr.keterangan || '', '',
        ];
      }
      if (dr.type === 'utiltoken') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const p1 = Number(dr.prevS1) || 0;
        const p2 = Number(dr.prevS2) || 0;
        return [
          dr.no ?? null, dr.nama || '', dr.satuan || '', dr.threshold ?? null,
          dr.prevS1 ?? null, dr.tglRefill || '', dr.tglRefill || '',
          dr.prevS2 ?? null, dr.tglPakai || '',
          (p1 > 0 || p2 > 0) ? p2 - p1 : null,
          utilTokenStatus(dr.prevS2, th), dr.keterangan || '', '',
        ];
      }
      if (dr.type === 'itemdate') {
        const th = typeof dr.threshold === 'number' ? dr.threshold : null;
        const statusStr = dateTypeStatus(dr.hariBerlalu ?? null, th);
        return [
          dr.no ?? null, dr.nama || '', dr.satuan || '', dr.threshold ?? null,
          formatDateShort(dr.tglTercatat), dr.hariBerlalu ?? null, statusStr, dr.keterangan || '',
          null, null, null, null, null,
        ];
      }
      if (dr.type === 'itemtext') {
        return [
          dr.no ?? null, dr.nama || '', dr.satuan || '', dr.keterangan || '',
          null, null, null, null, null, null, null, null, null,
        ];
      }
      const th = typeof dr.threshold === 'number' ? dr.threshold : null;
      const statusStr = expiryTypeStatus(dr.sisaHari ?? null, th);
      return [
        dr.no ?? null, dr.nama || '', dr.satuan || '', formatDateShort(dr.tglKedaluwarsa),
        dr.sisaHari ?? null, statusStr, dr.keterangan || '',
        null, null, null, null, null, null,
      ];
    });

    try {
      ws.addTable({
        name: tableName,
        ref: tableRef,
        headerRow: true,
        totalsRow: false,
        columns: colNames.map(name => ({ name, filterButton: true })),
        rows,
      });
    } catch {
      // Abaikan bila platform spreadsheet viewer tidak mendukung addTable
    }
  });

  // 8. Output berkas buffer murni
  const buffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer, fileName };
}
