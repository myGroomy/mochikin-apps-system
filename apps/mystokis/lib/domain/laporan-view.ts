// lib/domain/laporan-view.ts
// Server-side view model builder for the public laporan web view (Supabase RDBMS)

import { getOpnameDetailFromDb } from './stokis-repository';
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

export function normalizeStatusIsi(val: unknown, total?: number): 'Penuh' | 'Dipakai' | 'Habis' | '' {
  if (val != null) {
    const s = String(val).trim().toLowerCase();
    if (s === 'penuh' || s === 'full' || s === 'true' || s === '1' || s === 'ada' || s === 'aman') return 'Penuh';
    if (s === 'dipakai' || s === 'hampir' || s === 'sedang dipakai') return 'Dipakai';
    if (s === 'habis' || s === 'empty' || s === 'false' || s === '0' || s === 'kosong' || s === 'kritis') return 'Habis';
  }
  if (total != null && Number.isFinite(total) && total > 0) {
    return 'Penuh';
  }
  return '';
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
  return unique.map((p) => getGroup(p));
}

// ── Public Types ───────────────────────────────────────────────

export interface ViewItem {
  itemId: string;
  namaBarang: string;
  area: string;
  satuan: string;
  threshold: number | null;
  point?: number;
  tipeInput: string;
  group: InputTypeGroup;
  groups: InputTypeGroup[];
  step1: number;
  step2: number;
  total: number;
  penggunaan: number | null;
  keterangan: string;
  prevStep1: number | null;
  prevStep2: number | null;
  prevTotal: number | null;
  statusRaw: string;
  statusLabel: string;
  badgeClass: string;
  statusBadge: string;
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
  totalPoints: number;
}

export interface ViewMeta {
  laporanId: string;
  sesiId: string;
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
  totalPoints?: number;
  driveFileId?: string;
  xlsxLink?: string;
}

export type LaporanMeta = ViewMeta;

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
  const detail = await getOpnameDetailFromDb(laporanId);
  if (!detail || !detail.header) throw new Error('Laporan tidak ditemukan');

  const { header, items: detailRows } = detail;
  const cabangNama = header.cabangNama || cabangId;
  const cabangKode = header.cabangId || cabangId;
  const sesiId = header.sesiId;
  const tanggalOperasional = header.tanggalOperasional;
  const baseDate = normalizeDate(tanggalOperasional) ?? new Date();

  const allItems: ViewItem[] = detailRows.map((r) => {
    const itemId = r.itemId;
    const tipeInput = 'dual';
    const group = getGroup(tipeInput);
    const groups = getGroups(tipeInput);

    const step1 = Number(r.step1) || 0;
    const step2 = Number(r.step2) || 0;
    const total = Number(r.total) || 0;
    const prevTotal = null;
    const penggunaan = Number(r.penggunaan) || 0;
    const threshold = parseThreshold(r.threshold);

    const statusIsi = normalizeStatusIsi(r.statusIsi, total);
    const statusLabel = r.status || (threshold != null ? regularStatus(total, threshold) : '—');
    const badgeClass = statusBadgeClass(statusLabel);

    const tglRefill = r.tglRefill || '';
    const tglPakai = r.tglPakai || '';
    const tglKedaluwarsa = r.tglKedaluwarsa || '';

    return {
      itemId,
      namaBarang: r.namaBarang,
      area: r.area || 'Area Umum',
      satuan: r.satuan || 'Pcs',
      threshold,
      step1,
      step2,
      total,
      prevStep1: null,
      prevStep2: null,
      prevTotal,
      penggunaan,
      keterangan: r.note || '',
      tipeInput,
      group,
      groups,
      statusRaw: statusLabel,
      statusLabel,
      badgeClass,
      statusBadge: badgeClass,
      point: 1,
      statusIsi,
      tglRefill,
      tglPakai,
      tglKedaluwarsa,
      tglRefillFormatted: fmtDateShort(tglRefill),
      tglPakaiFormatted: fmtDateShort(tglPakai),
      tglKedaluwarsaFormatted: fmtDateShort(tglKedaluwarsa),
      hariBerlalu: group === 'date' ? daysBetweenUtc(normalizeDate(tglRefill), baseDate) : null,
      sisaHari: group === 'expiry' ? daysBetweenUtc(baseDate, normalizeDate(tglKedaluwarsa)) : null,
    };
  });

  const scoreCards: ViewScoreCards = {
    total: allItems.length,
    kritis: header.jumlahKritis,
    hampirHabis: header.jumlahHampirHabis,
    aman: Math.max(0, allItems.length - header.jumlahKritis - header.jumlahHampirHabis),
    tidakDipantau: 0,
    totalPoints: allItems.length,
  };

  const areaMap = new Map<string, ViewItem[]>();
  allItems.forEach((it) => {
    const area = it.area || 'Area Umum';
    if (!areaMap.has(area)) areaMap.set(area, []);
    areaMap.get(area)!.push(it);
  });

  const areaGroups: AreaGroup[] = [];
  for (const [area, items] of areaMap) {
    items.sort((a, b) => a.namaBarang.localeCompare(b.namaBarang));
    areaGroups.push({ area, items });
  }

  return {
    meta: {
      laporanId,
      sesiId,
      cabangKode,
      cabangNama,
      tanggalOperasional,
      tanggalFormatted: fmtDateShort(tanggalOperasional),
      shift: header.shift,
      petugas: header.petugas,
      prevTanggal: '',
      prevTanggalFormatted: '-',
      prevShift: '',
      prevPetugas: '',
      note: header.note,
      linkXlsx: `/api/so/${laporanId}/xlsx-file`,
      linkPdf: '',
      totalPoints: allItems.length,
    },
    scoreCards,
    areaGroups,
    allItems,
  };
}
