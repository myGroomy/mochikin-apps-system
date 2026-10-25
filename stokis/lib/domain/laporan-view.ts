// lib/domain/laporan-view.ts
// Server-side view model builder for the public laporan web view.
// Mirrors spreadsheet layout logic (xlsx-report.ts / template-xlsx.ts) but
// returns a plain data structure instead of ExcelJS workbook.

import { resolveCabang } from '@/lib/google/registry';
import { getMasterItems } from './master-item-service';
import { getLaporanById, getLaporanDetail, getSesiLiveData, searchLaporan } from './laporan-service';
import { formatDate } from './ids';
import { parseThreshold } from './so';
import {
  dateTypeStatus, expiryTypeStatus,
  daysBetweenUtc, getReportTypes, reportTypeOrder,
} from './report-item-type';

// ── Date helpers (mirror xlsx-report.ts) ───────────────────────

function normalizeDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (/^\d{5,6}$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25569) * 86400000));
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

function fmtDateShort(v: unknown): string {
  const d = normalizeDate(v);
  if (!d) return '-';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

// ── Status computation (mirrors xlsx-report.ts getStatus) ──────

function regularStatus(total: number, threshold: number | null | undefined): 'KRITIS' | 'HAMPIR HABIS' | 'AMAN' | '—' {
  if (threshold == null || isNaN(threshold) || threshold < 0) return '—';
  if (total <= threshold) return 'KRITIS';
  if (threshold > 0 && total <= threshold * 2) return 'HAMPIR HABIS';
  return 'AMAN';
}

function booleanStatusLabel(statusIsi: string): string {
  const s = (statusIsi || '').toLowerCase();
  if (s === 'habis') return '🔴 KRITIS — Habis';
  if (s === 'dipakai') return '🟠 HAMPIR HABIS — Dipakai';
  if (s === 'penuh') return '🟢 AMAN — Penuh';
  return '—';
}

function statusBadgeClass(status: string): string {
  const s = String(status || '').toLowerCase();
  if (s.includes('kritis') || s.includes('habis')) return 'badge-error';
  if (s.includes('hampir') || s.includes('dipakai')) return 'badge-warning';
  if (s.includes('aman') || s.includes('penuh')) return 'badge-success';
  return 'badge-ghost';
}

// ── Type detection ─────────────────────────────────────────────

export type InputTypeGroup = 'dual' | 'single' | 'boolean' | 'date' | 'expiry' | 'text' | 'utilitas';

function getGroup(tipeInput: string): InputTypeGroup {
  const t = (tipeInput || '').toLowerCase();
  if (t.includes('boolean')) return 'boolean';
  if (t.includes('single')) return 'single';
  if (t.includes('date')) return 'date';
  if (t.includes('expiry')) return 'expiry';
  if (t.includes('text')) return 'text';
  if (t.includes('utilitas')) return 'utilitas';
  return 'dual';
}

function getGroups(tipeInput: string): InputTypeGroup[] {
  const parts = (tipeInput || '').toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  if (unique.length === 0) return ['dual'];
  return unique as InputTypeGroup[];
}

// ── Types ──────────────────────────────────────────────────────

export interface ViewMeta {
  laporanId: string;
  cabangKode: string;
  cabangNama: string;
  tanggalOperasional: string;
  tanggalFormatted: string;
  shift: string;
  petugas: string;
  prevTanggal: string;
  prevTanggalFormatted: string;
  prevShift: string;
  prevPetugas: string;
  note: string;
  linkXlsx: string;
  linkPdf: string;
}

export interface ViewItem {
  itemId: string;
  namaBarang: string;
  area: string;
  satuan: string;
  threshold: number | null;
  tipeInput: string;
  group: InputTypeGroup; // primary type (status computation)
  groups: InputTypeGroup[]; // all types (multi-group assignment)
  step1: number;
  step2: number;
  total: number;
  penggunaan: number;
  keterangan: string;
  prevStep1: number | null;
  prevStep2: number | null;
  prevTotal: number | null;
  statusRaw: string;
  statusLabel: string;
  badgeClass: string;
  statusIsi: string;
  tglRefill: string;
  tglRefillFormatted: string;
  tglPakai: string;
  tglPakaiFormatted: string;
  tglKedaluwarsa: string;
  tglKedaluwarsaFormatted: string;
  hariBerlalu: number | null;
  sisaHari: number | null;
}

export interface AreaGroup {
  area: string;
  items: ViewItem[];
}

export interface ViewScoreCards {
  total: number;
  kritis: number;
  hampirHabis: number;
  aman: number;
  tidakDipantau: number;
}

export interface LaporanView {
  meta: ViewMeta;
  scoreCards: ViewScoreCards;
  areaGroups: AreaGroup[];
  allItems: ViewItem[];
}

// ── Builder ────────────────────────────────────────────────────

export async function buildLaporanView(
  cabangId: string,
  laporanId: string
): Promise<LaporanView> {
  // Resolve cabang
  const { spreadsheetId, cabang } = await resolveCabang(cabangId);
  const cabangNama = String(cabang['Nama_Cabang'] || cabangId);
  const cabangKode = cabangId;

  // Read laporan metadata
  const laporan = await getLaporanById(cabangId, laporanId);
  if (!laporan) throw new Error('Laporan tidak ditemukan');

  // Read detail rows
  const detailRows = await getLaporanDetail(cabangId, laporanId);
  if (detailRows.length === 0) throw new Error('Detail laporan belum tersedia');

  // Master items for Tipe_Input
  const masterItems = await getMasterItems(cabangId);
  const tipeInputMap = new Map<string, string>();
  masterItems.forEach((m: Record<string, unknown>) => {
    tipeInputMap.set(String(m['Item_ID'] || ''), String(m['Tipe_Input'] || ''));
  });

  // Live fallback for old reports
  const sesiId = String(laporan['Sesi_ID'] || '');
  const live = await getSesiLiveData(spreadsheetId, sesiId);

  // Base date for date/expiry computations
  const tanggalOperasional = String(laporan['Tanggal_Operasional'] || '');
  const baseDate = normalizeDate(tanggalOperasional) ?? new Date();

  // Previous SO info
  const prevTanggal = detailRows[0]?.['Prev_Tanggal'] ? String(detailRows[0]['Prev_Tanggal']) : '';
  const prevShift = String(detailRows[0]?.['Prev_Shift'] || '');
  const previousReports = prevTanggal
    ? await searchLaporan(cabangId, { tanggal: formatDate(prevTanggal), shift: prevShift })
    : [];
  const previousReport = previousReports[previousReports.length - 1];
  const prevPetugas = String(previousReport?.['Petugas'] || '');

  // Build items
  const allItems: ViewItem[] = detailRows.map((r) => {
    const itemId = String(r['Item_ID'] || '');
    const fb = live.byItemId[itemId] || {};
    const tipeInput = tipeInputMap.get(itemId) || '';
    const group = getGroup(tipeInput);
    const groups = getGroups(tipeInput);

    const step1 = Number(r['Step1']) || 0;
    const step2 = Number(r['Step2']) || 0;
    const total = step1 + step2;
    const prevStep1 = r['Prev_Step1'] != null && String(r['Prev_Step1']) !== '' ? Number(r['Prev_Step1']) : null;
    const prevStep2 = r['Prev_Step2'] != null && String(r['Prev_Step2']) !== '' ? Number(r['Prev_Step2']) : null;
    const prevTotal = r['Prev_Total'] != null && String(r['Prev_Total']) !== '' ? Number(r['Prev_Total']) : null;
    // Pemakaian positif saat SO sekarang bertambah, negatif saat berkurang.
    const penggunaan = prevTotal != null ? total - prevTotal : 0;
    const threshold = parseThreshold(r['Threshold']);

    const statusIsi = (['Penuh', 'Dipakai', 'Habis'].includes(String(r['Status_Isi'])))
      ? r['Status_Isi'] as 'Penuh' | 'Dipakai' | 'Habis'
      : (fb.statusIsi || '');
    const tglRefill = String(r['Tgl_Refill'] || fb.tglRefill || '');
    const tglPakai = String(r['Tgl_Pakai'] || fb.tglPakai || '');
    const tglKedaluwarsa = String(r['Tgl_Kedaluwarsa'] || '');

    // Compute status based on group
    let statusRaw: string;
    let statusLabel: string;

    if (group === 'dual' || group === 'single') {
      statusRaw = regularStatus(total, threshold);
      statusLabel = statusRaw === 'KRITIS' ? '🔴 KRITIS'
        : statusRaw === 'HAMPIR HABIS' ? '🟠 HAMPIR HABIS'
        : statusRaw === 'AMAN' ? '🟢 AMAN'
        : '—';
    } else if (group === 'boolean') {
      statusLabel = booleanStatusLabel(statusIsi);
      statusRaw = statusLabel;
    } else if (group === 'date') {
      const hariBerlalu = daysBetweenUtc(normalizeDate(tglRefill), baseDate);
      statusLabel = dateTypeStatus(hariBerlalu, threshold);
      statusRaw = statusLabel;
    } else if (group === 'expiry') {
      const sisaHari = daysBetweenUtc(baseDate, normalizeDate(tglKedaluwarsa));
      statusLabel = expiryTypeStatus(sisaHari, threshold);
      statusRaw = statusLabel;
    } else {
      statusRaw = '—';
      statusLabel = '—';
    }

    return {
      itemId,
      namaBarang: String(r['Nama_Barang'] || ''),
      area: String(r['Area'] || 'Area Umum'),
      satuan: String(r['Satuan'] || ''),
      threshold,
      tipeInput,
      group,
      groups,
      step1,
      step2,
      total,
      penggunaan,
      keterangan: String(r['Keterangan'] || ''),
      prevStep1,
      prevStep2,
      prevTotal,
      statusRaw,
      statusLabel,
      badgeClass: statusBadgeClass(statusLabel),
      statusIsi,
      tglRefill,
      tglRefillFormatted: fmtDateShort(tglRefill),
      tglPakai,
      tglPakaiFormatted: fmtDateShort(tglPakai),
      tglKedaluwarsa,
      tglKedaluwarsaFormatted: fmtDateShort(tglKedaluwarsa),
      hariBerlalu: group === 'date' ? daysBetweenUtc(normalizeDate(tglRefill), baseDate) : null,
      sisaHari: group === 'expiry' ? daysBetweenUtc(baseDate, normalizeDate(tglKedaluwarsa)) : null,
    };
  });

  // Score cards
  const scoreCards: ViewScoreCards = {
    total: allItems.length,
    kritis: 0,
    hampirHabis: 0,
    aman: 0,
    tidakDipantau: 0,
  };
  allItems.forEach((it) => {
    const s = it.statusLabel.toLowerCase();
    if (s.includes('kritis') || s === '🔴 kritis — habis') scoreCards.kritis += 1;
    else if (s.includes('hampir') || s.includes('dipakai')) scoreCards.hampirHabis += 1;
    else if (s.includes('aman') || s.includes('penuh')) scoreCards.aman += 1;
    else scoreCards.tidakDipantau += 1;
  });

  // Group by area (XLSX-like: area-first)
  const areaMap = new Map<string, ViewItem[]>();
  allItems.forEach((it) => {
    const area = it.area || 'Area Umum';
    if (!areaMap.has(area)) areaMap.set(area, []);
    areaMap.get(area)!.push(it);
  });

  // Sort items within each area by group order (like template-xlsx)
  const areaGroups: AreaGroup[] = [];
  for (const [area, items] of areaMap) {
    items.sort((a, b) => {
      const typeA = getReportTypes(a.tipeInput)[0] || 'dual';
      const typeB = getReportTypes(b.tipeInput)[0] || 'dual';
      const orderA = reportTypeOrder(typeA);
      const orderB = reportTypeOrder(typeB);
      if (orderA !== orderB) return orderA - orderB;
      // Within same type: status-based sort (kritis first for regular/date/expiry)
      const statusRank = (s: string) => {
        const sl = s.toLowerCase();
        if (sl.includes('kritis') || sl.includes('habis')) return 0;
        if (sl.includes('hampir') || sl.includes('dipakai')) return 1;
        if (sl.includes('aman') || sl.includes('penuh')) return 2;
        return 3;
      };
      return statusRank(a.statusLabel) - statusRank(b.statusLabel);
    });
    areaGroups.push({ area, items });
  }

  const note = allItems.find((it) => it.keterangan && it.group === 'text')?.keterangan
    || String(detailRows[0]?.['Note'] || live.note || '');

  return {
    meta: {
      laporanId,
      cabangKode,
      cabangNama,
      tanggalOperasional,
      tanggalFormatted: fmtDateShort(tanggalOperasional),
      shift: String(laporan['Shift'] || ''),
      petugas: String(laporan['Petugas'] || ''),
      prevTanggal,
      prevTanggalFormatted: fmtDateShort(prevTanggal),
      prevShift,
      prevPetugas,
      note: note || String(detailRows[0]?.['Note'] || live.note || ''),
      linkXlsx: String(laporan['Link_XLSX'] || ''),
      linkPdf: String(laporan['Link_PDF'] || ''),
    },
    scoreCards,
    areaGroups,
    allItems,
  };
}
