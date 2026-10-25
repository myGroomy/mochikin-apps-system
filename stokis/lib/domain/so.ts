// lib/domain/so.ts
// Konstanta kolom + tipe domain untuk tabel Stock Opname & Laporan.
// Port dari SO_COL (Utils.js) dan struktur sheet.

export const SO_COL = {
  Transaksi_ID: 1,
  Timestamp: 2,
  Tanggal_Operasional: 3,
  Shift: 4,
  Item_ID: 5,
  Nama_Barang: 6,
  Area: 7,
  Step1: 8,
  Step2: 9,
  Total: 10,
  Petugas: 11,
  Sesi_ID: 12,
  Keterangan: 13,
  Status_Isi: 14,
  Tgl_Refill: 15,
  Tgl_Pakai: 16,
  Note: 17,
  Tgl_Kedaluwarsa: 18,
} as const;

export function calculateStatus(total: number, threshold: number | null | undefined): string {
  if (threshold === null || threshold === undefined || isNaN(threshold) || threshold < 0) {
    return 'Tidak Dipantau';
  }
  if (total <= threshold) return 'Kritis';
  if (threshold > 0 && total <= threshold * 2) return 'Hampir Habis';
  return 'Aman';
}

export function parseThreshold(v: unknown): number | null {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Filter free-form decimal text for controlled inputs.
 * Avoids mobile keyboard digit-duplication bugs from controlled <input type="number">.
 * Allows digits and a single decimal separator (`.` or `,`, normalized to `.`).
 */
export function sanitizeDecimalInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.');
  let out = '';
  let seenDot = false;
  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
    } else if (ch === '.' && !seenDot) {
      out += '.';
      seenDot = true;
    }
  }
  return out;
}

export type InputTipe = 'single' | 'dual' | 'boolean' | 'date' | 'text' | 'expiry';

export function parseTipeInput(raw: unknown): InputTipe[] {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return ['dual'];
  const allowed = new Set<InputTipe>(['single', 'dual', 'boolean', 'date', 'text', 'expiry']);
  const parsed = s
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is InputTipe => allowed.has(t as InputTipe));
  return parsed.length > 0 ? parsed : ['dual'];
}

export function hasTipe(tipeInput: InputTipe[], tipe: InputTipe): boolean {
  return tipeInput.includes(tipe);
}

export interface SOItem {
  itemId: string;
  step1: number;
  step2: number;
  total: number;
  keterangan: string;
  statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill?: string;
  tglPakai?: string;
  tglKedaluwarsa?: string;
}

export interface ValidatedSOPayload {
  sesiId: string;
  tanggalOperasional: string;
  shift: string;
  petugas: string;
  items: SOItem[];
  note?: string;
}

export function isNonNegativeNumber(v: unknown): boolean {
  if (typeof v === 'number') return isFinite(v) && v >= 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return isFinite(n) && n >= 0;
  }
  return false;
}

export function normalizeCount(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? n : 0;
}

/** Tanggal hari ini dalam zona waktu lokal (bukan UTC), format yyyy-mm-dd. */
export function todayLocalISO(d = new Date()): string {
  return toLocalISO(d);
}

export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ValidationError {
  code: string;
  message: string;
}
