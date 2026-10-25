// lib/google/template-xlsx.ts
// Baca template .xlsx lokal → isi data dengan ExcelJS → return buffer.
// Semua formatting template (font, warna, border, merged cells, column widths) dipertahankan.

import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import type { XlsxItem, XlsxReportInput } from '@/lib/domain/xlsx-report';
import { XLSX_FONT } from '@/lib/domain/xlsx-report';
import { parseThreshold } from '@/lib/domain/so';
import {
  getReportTypes,
  daysBetweenUtc,
  dateTypeStatus,
  expiryTypeStatus,
  type ReportItemType,
} from '@/lib/domain/report-item-type';

const TEMPLATE_PATH = path.join(process.cwd(), 'Templates', 'PREVIEW SO FORMAT REPORTS (1).xlsx');

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

// ── Type detection (replaces heuristic isUtilitasBoolean/isUtilitasNumeric/isMinyak) ──

/**
 * Returns all ReportItemType for this item.
 * For compound tipeInput (e.g. 'dual,boolean'), the item appears in multiple sub-tables.
 */
function getItemTypes(it: XlsxItem): ReportItemType[] {
  return getReportTypes(it.tipeInput);
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

// boolean type — same content as the old GAS_HEADERS
const GAS_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'NILAI SAAT INI', 'STATUS ISI', 'TGL ISI',
  'TGL RESTOCK', 'TGL PAKAI', 'PEMAKAIAN',
  'STATUS STOK', 'KETERANGAN', '-',
];

const TOKEN_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD',
  'JUMLAH RESTOCK', 'TGL ISI', 'TGL RESTOCK',
  'NILAI SAAT INI', 'TGL PAKAI', 'PEMAKAIAN',
  'STATUS STOK', 'KETERANGAN', '-',
];

// date type: No | NAMA BARANG | SATUAN | THRESHOLD (HARI) | TGL TERCATAT | HARI BERLALU | STATUS STOK | KETERANGAN | (5 filler cols to reach 13)
const DATE_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'THRESHOLD\n(HARI)',
  'TGL TERCATAT', 'HARI BERLALU', 'STATUS STOK', 'KETERANGAN',
  '-', '-', '-', '-', '-',
];

// text type: No | NAMA BARANG | SATUAN | KETERANGAN | (9 filler cols)
const TEXT_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'KETERANGAN',
  '-', '-', '-', '-', '-', '-', '-', '-', '-',
];

// expiry type: No | NAMA BARANG | SATUAN | TGL KEDALUWARSA | SISA HARI | STATUS STOK | KETERANGAN | (6 filler cols)
const EXPIRY_HEADERS = [
  'No', 'NAMA BARANG', 'SATUAN', 'TGL KEDALUWARSA',
  'SISA HARI', 'STATUS STOK', 'KETERANGAN',
  '-', '-', '-', '-', '-', '-',
];

// ── DataRow types ────────────────────────────────────────────────────────────

interface DataRowBase {
  no?: number;
  nama?: string;
  satuan?: string;
  threshold?: number | string;
  keterangan?: string;
  areaName?: string;
  noteText?: string;
}

interface DataRowDual extends DataRowBase {
  type: 'item';
  prevS1?: number | string | null;
  prevS2?: number | string | null;
  prevTotal?: number | string | null;
  s1?: number;
  s2?: number;
  isSingle?: boolean; // single items merged Step1+Step2 visually
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
  tglTercatat?: string; // maps to tglRefill
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
  /** true = Area divider should be written before this block */
  isFirstInArea?: boolean;
  areaName?: string;
}

// ── Border helper ─────────────────────────────────────────────────────────────

const THIN_BORDER = {
  top: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  left: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateXlsxFromTemplate(
  input: XlsxReportInput
): Promise<{ buffer: Buffer; fileName: string }> {

  // ── Build file name ───────────────────────────────────────────────
  const kode = (input.cabangKode || 'CBG').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const d = normalizeDate(input.tanggalOperasional);
  const tgl = d
    ? `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`
    : String(input.tanggalOperasional || '');
  const shiftLabel = (input.shift || 'SO').toUpperCase();
  const petugasLabel = String(input.petugas || 'Petugas').replace(/[/\\:*?"<>|]/g, '').trim();
  const fileName = `${kode} - ${tgl} - ${shiftLabel} - ${petugasLabel}.xlsx`;

  // ── 1. Read template from local file ──────────────────────────────
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);

  // ── 2. Open with ExcelJS ─────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(templateBuffer as any);
  const ws = wb.getWorksheet('SO DETAILS') || wb.worksheets[0];
  if (!ws) throw new Error('Sheet SO DETAILS tidak ditemukan di template');

  // ── 3. Group items by Area, then by tipeInput sub-group ──────────
  //
  // Algorithm:
  //   - Group all items by Area.
  //   - Within each Area, split into sub-groups by ReportItemType.
  //   - 'dual' and 'single' share the same sub-group (headerType: 'regular').
  //   - 'boolean' → headerType: 'utilgas'
  //   - 'text'    → headerType: 'text'
  //   - 'date'    → headerType: 'date'
  //   - 'expiry'  → headerType: 'expiry'
  //
  // For items with compound tipeInput (e.g. 'boolean,date'), we route each item
  // by its primary type (first entry from getReportTypes).

  const groupMode: 'Area' | 'Urutan_Input' | 'Tipe_Input' =
    input.groupMode === 'Area' || input.groupMode === 'Urutan_Input' || input.groupMode === 'Tipe_Input'
      ? input.groupMode
      : 'Tipe_Input';
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Build area → item map
  const byArea = new Map<string, XlsxItem[]>();
  if (groupMode === 'Urutan_Input') {
    byArea.set('', input.items);
  } else {
    input.items.forEach((it) => {
      const key = (it.area || '').trim() || 'Area Umum';
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(it);
    });
  }

  // Per-area: split into typed sub-groups, order sub-groups by TYPE_ORDER
  const blocks: Block[] = [];
  let globalNo = 0;

  byArea.forEach((areaItems, areaKey) => {
    // Sub-group map: 'regular' | 'utilgas' | 'utiltoken' | 'date' | 'text' | 'expiry'
    // Note: 'utiltoken' is kept for backward compat but its items come from 'single'
    // that are in a utilitas area — however per new plan, single goes into 'regular'.
    // The 'utiltoken' sub-group is no longer created here; single always → regular.
    type SubKey = 'regular' | 'utilgas' | 'date' | 'text' | 'expiry';
    const subGroups = new Map<SubKey, XlsxItem[]>();
    const ensureSub = (k: SubKey) => { if (!subGroups.has(k)) subGroups.set(k, []); };

    areaItems.forEach((it) => {
      const types = getItemTypes(it);
      for (const primary of types) {
        if (primary === 'dual' || primary === 'single') {
          ensureSub('regular'); subGroups.get('regular')!.push(it);
        } else if (primary === 'boolean') {
          ensureSub('utilgas'); subGroups.get('utilgas')!.push(it);
        } else if (primary === 'date') {
          ensureSub('date'); subGroups.get('date')!.push(it);
        } else if (primary === 'text') {
          ensureSub('text'); subGroups.get('text')!.push(it);
        } else if (primary === 'expiry') {
          ensureSub('expiry'); subGroups.get('expiry')!.push(it);
        } else {
          ensureSub('regular'); subGroups.get('regular')!.push(it);
        }
      }
    });

    // Order: regular, utilgas, date, text, expiry
    const subOrder: SubKey[] = ['regular', 'utilgas', 'date', 'text', 'expiry'];
    let isFirstBlock = true;

    subOrder.forEach((subKey) => {
      const subItems = subGroups.get(subKey);
      if (!subItems || subItems.length === 0) return;

      const headerType = subKey === 'regular' ? 'regular' : subKey;
      const blockItems: DataRow[] = [];

      if (subKey === 'regular') {
        // Sort by status rank (KRITIS first)
        const sorted = [...subItems].sort((a, b) => {
          const aTh = parseThreshold(a.threshold);
          const bTh = parseThreshold(b.threshold);
          return regularStatusRank(Number(a.step1) || 0, Number(a.step2) || 0, aTh)
               - regularStatusRank(Number(b.step1) || 0, Number(b.step2) || 0, bTh);
        });
        sorted.forEach((it) => {
          globalNo++;
          const primary = getItemTypes(it)[0] || 'dual';
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
        // Sort by days elapsed descending (worst = most elapsed = KRITIS first)
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
        const withDays = subItems.map((it) => {
          const expDate = normalizeDate(it.tglKedaluwarsa);
          const sisaHari = daysBetweenUtc(today, expDate);
          const th = parseThreshold(it.threshold);
          return { it, sisaHari, rank: expiryStatusRank(sisaHari, th) };
        });
        withDays.sort((a, b) => a.rank - b.rank);
        withDays.forEach(({ it, sisaHari }) => {
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

  // ── 4. Build header metadata ─────────────────────────────────────
  const currTgl = formatDateShort(input.tanggalOperasional);
  const prevTgl = formatDateShort(input.previousSOInfo?.tanggal);
  const prevShift = input.previousSOInfo?.shift || '-';
  const prevPetugas = input.previousSOInfo?.petugas || '-';
  const cabangLabel = input.cabangKode + ' (' + input.cabangNama + ')';
  const note = String(input.note || '').trim();

  // ── 5. Update header rows (rows 1-5) ─────────────────────────────
  ws.getCell('E1').value = `LAPORAN STOCK OPNAME HARIAN ${input.cabangNama.toUpperCase()}`;
  ws.getCell('E1').font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.title.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  ws.getCell('E2').font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  ws.getCell('H2').font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  ws.getCell('A3').value = cabangLabel;
  ws.getCell('C3').value = currTgl;
  ws.getCell('D3').value = input.shift;
  ws.getCell('E3').value = input.petugas;
  ws.getCell('F3').value = input.shift;
  ws.getCell('H3').value = cabangLabel;
  ws.getCell('J3').value = prevTgl;
  ws.getCell('K3').value = prevShift;
  ws.getCell('L3').value = prevPetugas;
  for (const addr of ['A3', 'C3', 'D3', 'E3', 'F3', 'H3', 'J3', 'K3', 'L3']) {
    ws.getCell(addr).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.info.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  }
  ws.getCell('A4').font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  ws.getCell('K4').font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.groupHeader.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  for (let c = 1; c <= 13; c++) {
    ws.getRow(5).getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.colHeader.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
  }

  // ── 5b. Freeze panes ─────────────────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 5 }];

  // ── 6. Remove template tables + truncate rows 6+ ─────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablesObj: any = (ws as any).tables || {};
  Object.keys(tablesObj).forEach((name: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any).removeTable(name);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w: any = ws;
  if (ws.rowCount > 5) {
    Object.keys(w._merges || {}).forEach((addr: string) => {
      const row = parseInt((addr.match(/\d+/) || ['0'])[0], 10);
      if (row >= 6) ws.unMergeCells(addr);
    });
    w._rows.splice(5, w._rows.length - 5);
  }

  // ── 7. Write blocks ──────────────────────────────────────────────

  interface BlockInfo {
    block: Block;
    headerRow: number;
    firstDataRow: number;
    lastDataRow: number;
  }
  const blockInfos: BlockInfo[] = [];
  let currentRow = 6;

  blocks.forEach((block) => {
    // Area divider — written once per area, before the first sub-group of that area
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
      for (let c = 1; c <= 13; c++) {
        row.getCell(c).border = THIN_BORDER;
      }
      currentRow++;
    }

    // Subheader row
    const headers = block.headerType === 'regular' ? REGULAR_HEADERS
      : block.headerType === 'utilgas' ? GAS_HEADERS
      : block.headerType === 'utiltoken' ? TOKEN_HEADERS
      : block.headerType === 'date' ? DATE_HEADERS
      : block.headerType === 'text' ? TEXT_HEADERS
      : EXPIRY_HEADERS; // 'expiry'

    const headerRow = currentRow;
    {
      const row = ws.getRow(currentRow);
      for (let c = 1; c <= 13; c++) {
        row.getCell(c).value = headers[c - 1];
        row.getCell(c).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.colHeader.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } as ExcelJS.Fill;
        row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        row.getCell(c).border = THIN_BORDER;
      }
      row.height = 28;
      currentRow++;
    }

    // Data rows
    const firstDataRow = currentRow;
    block.items.forEach((dr) => {
      const r = currentRow;
      const row = ws.getRow(r);

      if (dr.type === 'item') {
        // dual or single
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
          // Single type: merge columns 5-9, show total only in merged cell
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
        row.getCell(11).value = ''; // no numeric status for boolean
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

        // Layout: No(1) | Nama(2) | Satuan(3) | Threshold(4) | TglTercatat(5) | HariBerlalu(6) | Status(7) | Ket(8) | filler(9-13)
        row.getCell(1).value = dr.no;
        row.getCell(2).value = dr.nama || '';
        row.getCell(3).value = dr.satuan || '';
        row.getCell(4).value = dr.threshold ?? '';
        row.getCell(5).value = formatDateShort(dr.tglTercatat);
        row.getCell(6).value = hariBerlalu != null ? hariBerlalu : '';
        row.getCell(7).value = statusStr;
        row.getCell(8).value = dr.keterangan || '';
        // Merge filler columns 9-13 (empty)
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
        // Layout: No(1) | Nama(2) | Satuan(3) | Ket(4) | filler(5-13) merged
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

        // Layout: No(1) | Nama(2) | Satuan(3) | TglKed(4) | SisaHari(5) | Status(6) | Ket(7) | filler(8-13)
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

    // Empty rows between area sub-groups (3 rows after the last sub-group of each area)
    // We add them after every block; duplicate empties between sub-groups in same area
    // are acceptable (3 rows per block is consistent with existing behavior).
    for (let i = 0; i < 3; i++) {
      const emptyRow = ws.getRow(currentRow);
      for (let c = 1; c <= 13; c++) emptyRow.getCell(c).value = '';
      emptyRow.height = 15;
      currentRow++;
    }
  });

  // ── 8. Write note section ─────────────────────────────────────────
  if (note) {
    const noteHeaderRow = ws.getRow(currentRow);
    noteHeaderRow.getCell(1).value = 'KETERANGAN / CATATAN:';
    ws.mergeCells(`A${currentRow}:M${currentRow}`);
    noteHeaderRow.getCell(1).font = { name: XLSX_FONT.family, bold: true, size: XLSX_FONT.note.size, color: { argb: 'FFFFFFFF' } } as ExcelJS.Font;
    noteHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } } as ExcelJS.Fill;
    noteHeaderRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 13; c++) {
      noteHeaderRow.getCell(c).border = THIN_BORDER;
    }
    noteHeaderRow.height = 18;
    currentRow++;

    const noteContentRow = ws.getRow(currentRow);
    noteContentRow.getCell(1).value = note;
    ws.mergeCells(`A${currentRow}:M${currentRow}`);
    noteContentRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    noteContentRow.getCell(1).font = { name: XLSX_FONT.family, size: XLSX_FONT.note.size, color: { argb: 'FF000000' } } as ExcelJS.Font;
    for (let c = 1; c <= 13; c++) {
      noteContentRow.getCell(c).border = THIN_BORDER;
    }
    noteContentRow.height = 60;
    currentRow++;
  }

  // ── 9. Create Excel Tables per block ─────────────────────────────
  // NOTE: Each block gets one addTable() call. The table columns must match the
  // header row written in step 7. For merged-cell rows (single, date, text, expiry),
  // we still provide all 13 column slots in addTable rows — Excel just ignores/
  // collapses the empty filler values.

  const regularColNames = REGULAR_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const gasColNames = GAS_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const tokenColNames = TOKEN_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const dateColNames = DATE_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const textColNames = TEXT_HEADERS.map(h => h.replace(/\n/g, ' ').trim());
  const expiryColNames = EXPIRY_HEADERS.map(h => h.replace(/\n/g, ' ').trim());

  // Deduplicate column names (Excel Tables require unique column names)
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
    if (firstDataRow > lastDataRow) return; // empty block — skip

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
            total, null, null, null, null, // cols 5-9: merged single value
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
      // itemexpiry
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
    } catch (err) {
      console.warn(`Failed to create Table '${tableName}':`, err);
    }
  });

  // ── 10. Write buffer ──────────────────────────────────────────────
  const buffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer, fileName };
}
