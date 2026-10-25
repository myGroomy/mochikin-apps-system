import * as ExcelJS from 'exceljs';
import { parseThreshold } from './so';

// ── Font config — ubah di sini untuk mengubah semua font di XLSX ────
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
  /** Tanggal kedaluwarsa untuk tipe expiry (field baru, terpisah dari tglRefill/tglPakai). */
  tglKedaluwarsa?: string;
  tipeInput?: string;
}

type StatusType = 'KRITIS' | 'HAMPIR HABIS' | 'AMAN' | 'Tidak Dipantau';

function getStatus(step1: number, step2: number, threshold: number | null | undefined): StatusType {
  const total = step1 + step2;
  if (threshold === null || threshold === undefined || isNaN(threshold) || threshold < 0) {
    return 'Tidak Dipantau';
  }
  if (total <= threshold) return 'KRITIS';
  if (threshold > 0 && total <= threshold * 2) return 'HAMPIR HABIS';
  return 'AMAN';
}

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
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
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

function buildXlsxFileName(input: { cabangKode?: string; tanggalOperasional?: string; shift?: string; petugas?: string }): string {
  const kode = (input.cabangKode || 'CBG').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const d = normalizeDate(input.tanggalOperasional);
  const tgl = d
    ? `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`
    : String(input.tanggalOperasional || '');
  const shiftLabel = (input.shift || 'SO').toUpperCase();
  const petugasLabel = String(input.petugas || 'Petugas').replace(/[/\\:*?"<>|]/g, '').trim();
  return `${kode} - ${tgl} - ${shiftLabel} - ${petugasLabel}.xlsx`;
}

export interface XlsxReportInput {
  laporanId: string;
  cabangNama: string;
  cabangKode: string;
  tanggalOperasional: string;
  shift: string;
  petugas: string;
  items: XlsxItem[];
  groupMode?: 'Area' | 'Urutan_Input' | 'Tipe_Input';
  previousSOInfo?: { tanggal?: string | number | null; shift?: string | number | null; petugas?: string | number | null } | null;
  note?: string;
}

const COLORS = {
  headerInfo: 'FF2563EB', headerPrev: 'FF4B5563', headerCurr: 'FF059669', headerHasil: 'FFD97706',
  subHeader: 'FFE2E8F0', kritisText: 'FFB91C1C', kritisBg: 'FFFEE2E2',
  hampirText: 'FFA16207', hampirBg: 'FFFEF9C3', amanText: 'FF047857', amanBg: 'FFD1FAE5',
  dividerBg: 'FFDBEAFE', dividerText: 'FF1D4ED8',
  white: 'FFFFFFFF', textDark: 'FF1E293B',
  utilitasHeader: 'FFBDD7EE', utilitasInput: 'FFFFE599', utilitasOutput: 'FFE06666',
  utilitasAltBg: 'FFEBF3FB',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

function applyBordersToRow(row: ExcelJS.Row, maxCol: number) {
  for (let c = 1; c <= maxCol; c++) {
    row.getCell(c).border = THIN_BORDER;
  }
}

function isUtilitasBoolean(it: XlsxItem): boolean {
  const t = (it.tipeInput || '').toLowerCase();
  return t.includes('boolean');
}

function isUtilitasNumeric(it: XlsxItem): boolean {
  const t = (it.tipeInput || '').toLowerCase();
  return t.includes('single') || t.includes('dual');
}

/**
 * Tulis baris header kolom regular (No, NAMA BARANG, SATUAN, ...) — diulang tiap area.
 */
function writeSubHeaderRow(ws: ExcelJS.Worksheet, rowNumber: number) {
  const headers = ['No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD', 'STEP 1\nUTUH', 'STEP 2\nTERBUKA', 'TOTAL', 'STEP 1\nUTUH\n', 'STEP 2\nTERBUKA\n', 'TOTAL 2', 'PEMAKAIAN', 'STATUS\nSTOK', 'KETERANGAN'];
  const row = ws.insertRow(rowNumber, headers);
  for (let i = 1; i <= 13; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeader } } as any;
    cell.font = { name: XLSX_FONT.family, bold: true, color: { argb: COLORS.textDark }, size: XLSX_FONT.colHeader.size };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  }
  row.height = 28;
  return row;
}

/**
 * Tulis baris divider area (▶  AREA ...).
 */
function writeAreaDivider(ws: ExcelJS.Worksheet, rowNumber: number, areaName: string) {
  const row = ws.insertRow(rowNumber, ['', `▶  ${areaName}`]);
  ws.mergeCells(`B${rowNumber}:M${rowNumber}`);
  applyBordersToRow(row, 13);
  const cell = row.getCell(2);
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dividerBg } } as ExcelJS.Fill;
  cell.font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.divider.size, color: { argb: COLORS.dividerText } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  row.height = 18;
  return row;
}

/**
 * Tulis satu baris data item regular (layout 13 kolom A-M).
 */
function writeItemRow(ws: ExcelJS.Worksheet, rowNumber: number, no: number, it: XlsxItem) {
  const s1 = Number(it.step1) || 0;
  const s2 = Number(it.step2) || 0;
  const threshold = parseThreshold(it.threshold);
  const thresholdVal = threshold != null ? threshold : '';
  const p1 = it.prevStep1 != null && it.prevStep1 !== '' ? Number(it.prevStep1) : null;
  const p2 = it.prevStep2 != null && it.prevStep2 !== '' ? Number(it.prevStep2) : null;
  const prevTotal = (p1 != null || p2 != null)
    ? (p1 || 0) + (p2 || 0)
    : (it.prevTotal != null && it.prevTotal !== '' ? Number(it.prevTotal) : null);

  const row = ws.insertRow(rowNumber, [
    no,
    it.namaBarang || '',
    it.satuan || '',
    thresholdVal,
    p1 ?? '',
    p2 ?? '',
    prevTotal ?? '',
    s1,
    s2,
    '', '', '',
    it.keterangan || '',
  ]);

  const r = rowNumber;
  row.getCell(10).value = { formula: `SUM(H${r},I${r})` } as ExcelJS.CellFormulaValue;
  row.getCell(11).value = { formula: `IF(COUNTA(G${r},J${r})=0,"",J${r}-G${r})` } as ExcelJS.CellFormulaValue;
  row.getCell(12).value = { formula: `IF(D${r}=0,"—",IF(J${r}<=D${r},"🔴 KRITIS",IF(J${r}<=D${r}*2,"🟠 HAMPIR HABIS","🟢 AMAN")))` } as ExcelJS.CellFormulaValue;

  const status = getStatus(s1, s2, threshold);
  const ROW_COLORS: Record<StatusType, { bg: string; text: string }> = {
    'KRITIS': { bg: COLORS.kritisBg, text: COLORS.kritisText },
    'HAMPIR HABIS': { bg: COLORS.hampirBg, text: COLORS.hampirText },
    'AMAN': { bg: COLORS.amanBg, text: COLORS.amanText },
    'Tidak Dipantau': { bg: 'FFFFFFFF', text: COLORS.textDark },
  };
  const rc = ROW_COLORS[status];

  row.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rc.bg } } as any;
    cell.alignment = {
      horizontal: [1, 4, 5, 6, 7, 8, 9, 10, 11].includes(colNum) ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
    cell.font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: COLORS.textDark } };
  });

  const kCell = row.getCell(11);
  kCell.numFmt = '+0;-0;0';
  kCell.font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: COLORS.textDark } };

  const lCell = row.getCell(12);
  lCell.font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: rc.text } };

  row.height = 18;
  return row;
}

/**
 * Tulis baris header sub-layout UTILITAS Gas/Minyak:
 * No(A) | NAMA BARANG(B) | SATUAN(C) | THRESHOLD(D) | NILAI SAAT INI(E:F) | TGL ISI/RESTOCK(G:H) | TGL PAKAI(I:J) | PEMAKAIAN(K) | STATUS STOK(L) | KETERANGAN(M)
 */
function writeUtilitasGasHeader(ws: ExcelJS.Worksheet, rowNumber: number) {
  const row = ws.insertRow(rowNumber, [
    'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD', 'NILAI SAAT INI', '', 'TGL ISI / RESTOCK', '', 'TGL PAKAI', '', 'PEMAKAIAN', 'STATUS\nSTOK', 'KETERANGAN',
  ]);
  ws.mergeCells(`E${rowNumber}:F${rowNumber}`);
  ws.mergeCells(`G${rowNumber}:H${rowNumber}`);
  ws.mergeCells(`I${rowNumber}:J${rowNumber}`);
  for (let i = 1; i <= 13; i++) {
    const cell = row.getCell(i);
    cell.font = { name: XLSX_FONT.family, bold: true, color: { argb: COLORS.textDark }, size: XLSX_FONT.colHeader.size };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
    // Warna header: A-D = biru muda, E-H = kuning, I-J = kuning, K-M = merah muda
    if (i <= 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasHeader } } as any;
    } else if (i <= 10) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasInput } } as any;
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasOutput } } as any;
    }
  }
  row.height = 28;
  return row;
}

/**
 * Tulis baris header sub-layout UTILITAS Token Listrik:
 * No(A) | NAMA BARANG(B) | SATUAN(C) | THRESHOLD(D) | JUMLAH RESTOCK(E) | TGL ISI/RESTOCK(F:G) | NILAI SAAT INI(H) | TGL PAKAI(I:J) | PEMAKAIAN(K) | STATUS STOK(L) | KETERANGAN(M)
 */
function writeUtilitasTokenHeader(ws: ExcelJS.Worksheet, rowNumber: number) {
  const row = ws.insertRow(rowNumber, [
    'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD', 'JUMLAH RESTOCK', 'TGL ISI / RESTOCK', '', 'NILAI SAAT INI', 'TGL PAKAI', '', 'PEMAKAIAN', 'STATUS\nSTOK', 'KETERANGAN',
  ]);
  ws.mergeCells(`F${rowNumber}:G${rowNumber}`);
  ws.mergeCells(`I${rowNumber}:J${rowNumber}`);
  for (let i = 1; i <= 13; i++) {
    const cell = row.getCell(i);
    cell.font = { name: XLSX_FONT.family, bold: true, color: { argb: COLORS.textDark }, size: XLSX_FONT.colHeader.size };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
    if (i <= 4) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasHeader } } as any;
    } else if (i <= 10) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasInput } } as any;
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.utilitasOutput } } as any;
    }
  }
  row.height = 28;
  return row;
}

/**
 * Tulis baris data UTILITAS Gas/Minyak:
 * Nilai Saat Ini = statusIsi (Penuh/Dipakai/Habis), Tgl Refill, Tgl Pakai
 */
function writeUtilitasGasRow(ws: ExcelJS.Worksheet, rowNumber: number, no: number, it: XlsxItem) {
  const threshold = parseThreshold(it.threshold);
  const thresholdVal = threshold != null ? threshold : (it.threshold ? String(it.threshold) : '');
  const isAltRow = no % 2 === 0;
  const bgColor = isAltRow ? 'FFFFFFFF' : COLORS.utilitasAltBg;

  const row = ws.insertRow(rowNumber, [
    no,
    it.namaBarang || '',
    it.satuan || '',
    thresholdVal,
    it.statusIsi || '',  // NILAI SAAT INI (col E, merged E:F)
    '',                   // merge partner
    it.tglRefill || '',  // TGL ISI/RESTOCK (col G, merged G:H)
    '',                   // merge partner
    it.tglPakai || '',  // TGL PAKAI (col I, merged I:J)
    '',                   // merge partner
    '',                   // PEMAKAIAN (K) — gas tidak ada pemakaian numerik
    '',                   // STATUS STOK (L) — gas tidak ada status stok
    it.keterangan || '',
  ]);

  ws.mergeCells(`E${rowNumber}:F${rowNumber}`);
  ws.mergeCells(`G${rowNumber}:H${rowNumber}`);
  ws.mergeCells(`I${rowNumber}:J${rowNumber}`);

  row.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as any;
    cell.alignment = {
      horizontal: [1, 4, 5, 6, 7, 8, 9, 10].includes(colNum) ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
    cell.font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: COLORS.textDark }, bold: [5, 7, 9].includes(colNum) };
  });

  row.height = 18;
  return row;
}

/**
 * Tulis baris data UTILITAS Token Listrik:
 * Jumlah Restock = step1, Nilai Saat Ini = step2, Pemakaian = E-H (formula)
 */
function writeUtilitasTokenRow(ws: ExcelJS.Worksheet, rowNumber: number, no: number, it: XlsxItem) {
  const threshold = parseThreshold(it.threshold);
  const thresholdVal = threshold != null ? threshold : '';
  const jumlahRestock = Number(it.step1) || 0;
  const nilaiSaatIni = Number(it.step2) || 0;
  const isAltRow = no % 2 === 0;
  const bgColor = isAltRow ? 'FFFFFFFF' : COLORS.utilitasAltBg;

  const row = ws.insertRow(rowNumber, [
    no,
    it.namaBarang || '',
    it.satuan || '',
    thresholdVal,
    jumlahRestock,       // JUMLAH RESTOCK (col E)
    it.tglRefill || '',  // TGL ISI/RESTOCK (col F, merged F:G)
    '',                   // merge partner
    nilaiSaatIni,         // NILAI SAAT INI (col H)
    it.tglPakai || '',  // TGL PAKAI (col I, merged I:J)
    '',                   // merge partner
    '',                   // PEMAKAIAN (K) — formula
    '',                   // STATUS STOK (L) — formula
    it.keterangan || '',
  ]);

  ws.mergeCells(`F${rowNumber}:G${rowNumber}`);
  ws.mergeCells(`I${rowNumber}:J${rowNumber}`);

  const r = rowNumber;
  // PEMAKAIAN = Jumlah Restock - Nilai Saat Ini
  row.getCell(11).value = { formula: `E${r}-H${r}` } as ExcelJS.CellFormulaValue;
  // STATUS STOK
  row.getCell(12).value = {
    formula: `IF(D${r}=0,"—",IF(H${r}<=D${r},"🔴 KRITIS",IF(H${r}<=D${r}*2,"🟠 HAMPIR HABIS","🟢 AMAN")))`,
  } as ExcelJS.CellFormulaValue;

  row.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as any;
    cell.alignment = {
      horizontal: [1, 4, 5, 6, 7, 8, 9, 10, 11].includes(colNum) ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
    cell.font = { name: XLSX_FONT.family, size: XLSX_FONT.data.size, color: { argb: COLORS.textDark }, bold: [5, 8, 11].includes(colNum) };
  });

  const kCell = row.getCell(11);
  kCell.numFmt = '+0;-0;0';
  kCell.font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.data.size, color: { argb: COLORS.textDark } };

  row.height = 18;
  return row;
}

export async function generateXlsxReport(input: XlsxReportInput): Promise<{ buffer: Buffer; fileName: string }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('SO DETAILS');

  ws.columns = [
    { width: 7.88 },   // A
    { width: 27.63 },  // B
    { width: 13.63 },  // C
    { width: 12.63 },  // D
    { width: 19.13 },  // E
    { width: 15.5 },   // F
    { width: 11.13 },  // G
    { width: 16.25 },  // H
    { width: 15.13 },  // I
    { width: 12.25 },  // J
    { width: 17.63 },  // K
    { width: 20.88 },  // L
    { width: 28.5 },   // M
  ];

  const currTgl = formatDateShort(input.tanggalOperasional);
  const prevTgl = formatDateShort(input.previousSOInfo?.tanggal);
  const prevShift = input.previousSOInfo?.shift || '-';
  const prevPetugas = input.previousSOInfo?.petugas || '-';
  const cabangLabel = input.cabangKode + ' (' + input.cabangNama + ')';

  // ─── ROW 1: Title ────────────────────────────────────────────────
  const row1 = ws.insertRow(1, ['', '', '', '', `LAPORAN STOCK OPNAME HARIAN ${input.cabangNama.toUpperCase()}`]);
  ws.mergeCells('E1:J1');
  row1.getCell(5).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.title.size };
  row1.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  // ─── ROW 2: SO SEBELUMNYA / SO SEKARANG ─────────────────────────
  const row2 = ws.insertRow(2, ['', '', '', '', 'SO SEBELUMNYA', '', '', 'SO SEKARANG']);
  ws.mergeCells('E2:G2');
  ws.mergeCells('H2:J2');
  row2.getCell(5).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: COLORS.headerPrev } };
  row2.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  row2.getCell(8).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: COLORS.headerCurr } };
  row2.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // ─── ROW 3: Info baris ───────────────────────────────────────────
  const row3 = ws.insertRow(3, [
    cabangLabel, '', currTgl, input.shift, input.petugas, input.shift, '',
    cabangLabel, '', prevTgl, prevShift, prevPetugas, '',
  ]);
  ws.mergeCells('A3:B3');
  ws.mergeCells('F3:G3');
  ws.mergeCells('H3:I3');
  ws.mergeCells('L3:M3');
  applyBordersToRow(row3, 13);
  row3.getCell(1).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size };
  row3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(8).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size };
  row3.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 24;

  // ─── ROW 4: Section headers ──────────────────────────────────────
  const row4 = ws.insertRow(4, ['', '', '', 'INFORMASI BARANG', '', '', '', '', '', '', '', 'HASIL ANALISIS']);
  ws.mergeCells('A4:D4');
  ws.mergeCells('K4:M4');
  row4.getCell(1).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: COLORS.white } };
  row4.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerInfo } } as any;
  row4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  row4.getCell(11).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: COLORS.white } };
  row4.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerHasil } } as any;
  row4.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
  applyBordersToRow(row4, 13);
  ws.getRow(4).height = 24;

  // ─── ROW 5: Column headers ───────────────────────────────────────
  writeSubHeaderRow(ws, 5);

  // ─── SEPARATE ITEMS: Regular vs UTILITAS ─────────────────────────
  const regularItems: XlsxItem[] = [];
  const utilitasBoolean: XlsxItem[] = [];  // Gas/Minyak
  const utilitasNumeric: XlsxItem[] = [];  // Token Listrik

  input.items.forEach((it) => {
    if (isUtilitasBoolean(it)) {
      utilitasBoolean.push(it);
    } else if (isUtilitasNumeric(it) && (it.area || '').toLowerCase().includes('utilitas')) {
      utilitasNumeric.push(it);
    } else {
      regularItems.push(it);
    }
  });

  const hasUtilitas = utilitasBoolean.length > 0 || utilitasNumeric.length > 0;

  // ─── REGULAR DATA ROWS ──────────────────────────────────────────
  const groupMode: 'Area' | 'Urutan_Input' | 'Tipe_Input' =
    input.groupMode === 'Area' || input.groupMode === 'Urutan_Input' || input.groupMode === 'Tipe_Input'
      ? input.groupMode
      : 'Tipe_Input';
  const groups: Array<{ area?: string; items: XlsxItem[] }> = [];

  if (groupMode === 'Area' || groupMode === 'Tipe_Input') {
    const byArea = new Map<string, XlsxItem[]>();
    regularItems.forEach((it) => {
      const key = (it.area || '').trim() || 'Area Umum';
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(it);
    });
    byArea.forEach((items, area) => groups.push({ area, items }));
  } else {
    groups.push({ items: regularItems });
  }

  let rowNumber = 6;
  let globalNo = 0;

  groups.forEach((group) => {
    if (group.area != null) {
      writeAreaDivider(ws, rowNumber, group.area);
      rowNumber++;
    }
    writeSubHeaderRow(ws, rowNumber);
    rowNumber++;
    group.items.forEach((it) => {
      globalNo++;
      writeItemRow(ws, rowNumber, globalNo, it);
      rowNumber++;
    });
    rowNumber++;
  });

  // ─── UTILITAS SECTION ───────────────────────────────────────────
  if (hasUtilitas) {
    // Divider
    writeAreaDivider(ws, rowNumber, 'UTILITAS');
    rowNumber++;

    // Gas/Minyak sub-section
    if (utilitasBoolean.length > 0) {
      writeUtilitasGasHeader(ws, rowNumber);
      rowNumber++;
      utilitasBoolean.forEach((it) => {
        globalNo++;
        writeUtilitasGasRow(ws, rowNumber, globalNo, it);
        rowNumber++;
      });
      rowNumber++;
    }

    // Token Listrik sub-section
    if (utilitasNumeric.length > 0) {
      writeUtilitasTokenHeader(ws, rowNumber);
      rowNumber++;
      utilitasNumeric.forEach((it) => {
        globalNo++;
        writeUtilitasTokenRow(ws, rowNumber, globalNo, it);
        rowNumber++;
      });
      rowNumber++;
    }
  }

  // ─── CATATAN / NOTE ──────────────────────────────────────────────
  const note = String(input.note || '').trim();
  if (note) {
    const noteHeaderRow = ws.insertRow(rowNumber, ['KETERANGAN / CATATAN:']);
    ws.mergeCells(`A${rowNumber}:M${rowNumber}`);
    const nh = noteHeaderRow.getCell(1);
    nh.font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.note.size, color: { argb: COLORS.white } };
    nh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerHasil } } as any;
    nh.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBordersToRow(noteHeaderRow, 13);
    ws.getRow(rowNumber).height = 18;
    rowNumber++;

    const noteRow = ws.insertRow(rowNumber, [note]);
    ws.mergeCells(`A${rowNumber}:M${rowNumber}`);
    const nc = noteRow.getCell(1);
    nc.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    nc.font = { name: XLSX_FONT.family, size: XLSX_FONT.note.size, color: { argb: COLORS.textDark } };
    applyBordersToRow(noteRow, 13);
    ws.getRow(rowNumber).height = 60;
    rowNumber++;
  }

  // ─── FREEZE & FILTER ─────────────────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];
  ws.autoFilter = 'A5:M5';

  const buffer = await wb.xlsx.writeBuffer() as any as Buffer;
  return { buffer, fileName: buildXlsxFileName(input) };
}
