'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ShiftCabangGate } from '@/components/ShiftCabangGate';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import {
  ClipboardCheck,
  Send,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ShieldAlert,
  Hash,
  Search,
  Filter,
  StickyNote,
  X,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Pencil,
  AlertTriangle,
  ArrowLeft,
  Package,
  History,
  HardDrive,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { QuantumLoaderFull, QuantumLoaderMini } from '@/components/ui/QuantumLoader';
import { SOGeneratingOverlay, type SOGerStep } from '@/components/SOGeneratingOverlay';
import { staggerContainer, staggerItem } from '@/components/PageTransition';
import { parseTipeInput, hasTipe, sanitizeDecimalInput, todayLocalISO } from '@/lib/domain/so';
import type { InputTipe } from '@/lib/domain/so';

interface MasterItem {
  Item_ID: string;
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Threshold: number;
  Tipe_Input: string;
}

interface PreviousSO {
  step1: number;
  step2: number;
  total: number;
  tanggal: string;
  shift: string;
  petugas: string;
  keterangan: string;
  statusIsi?: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill?: string;
  tglPakai?: string;
}

export interface SOItemPayload {
  itemId: string;
  namaBarang: string;
  satuan: string;
  area: string;
  threshold: number;
  step1: number;
  step2: number;
  total: number;
  keterangan: string;
  prevStep1: number | null;
  prevStep2: number | null;
  prevTotal: number | null;
  prevTanggal: string | null;
  prevShift: string | null;
  prevKeterangan: string;
  statusIsi: 'Penuh' | 'Dipakai' | 'Habis' | '';
  tglRefill: string;
  tglPakai: string;
  prevStatusIsi: 'Penuh' | 'Dipakai' | 'Habis' | '' | null;
  prevTglRefill: string | null;
  prevTglPakai: string | null;
}

export interface SOFormState {
  sesiId: string;
  tanggalOperasional: string;
  shift: string;
  petugas: string;
  items: SOItemPayload[];
  cabangNama: string;
  cabangKode: string;
  note?: string;
}

function generateSesiId(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `SES_${time}${rand}`;
}

export interface SubmitSOResult {
  status?: string;
  sesiId?: string;
  laporanId?: string | null;
  rows_written?: number;
}

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

async function postWithRetry<T = SubmitSOResult>(
  url: string,
  body: unknown,
  attempts: number,
): Promise<{ result: ApiResult<T> }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResult<T>;
      return { result: json };
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ─── Draft persistence (save sementara per user: localStorage + cloud backup API) ───
const DRAFT_PREFIX = 'stokis_so_draft_user_';

export interface SODraft {
  counts: Record<string, { step1: string; step2: string; keterangan: string; statusIsi?: string; tglRefill?: string; tglPakai?: string }>;
  sesiId: string;
  tanggalOperasional: string;
  shift: string;
  note: string;
  updatedAt: number;
}

function getDraftKey(userKey: string): string {
  return DRAFT_PREFIX + userKey.trim().toLowerCase();
}

function countFilled(
  counts: Record<string, { step1: string; step2: string; keterangan: string; statusIsi?: string; tglRefill?: string; tglPakai?: string }>,
): number {
  return Object.keys(counts).reduce((n, k) => {
    const v = counts[k];
    const hasCount =
      String(v?.step1 ?? '').trim() !== '' || String(v?.step2 ?? '').trim() !== '' ||
      v?.statusIsi !== undefined || String(v?.tglRefill ?? '').trim() !== '' || String(v?.tglPakai ?? '').trim() !== '';
    return n + (hasCount ? 1 : 0);
  }, 0);
}

function loadLocalDraft(userKey: string): SODraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SODraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.counts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalDraft(userKey: string, draft: SODraft): void {
  try {
    localStorage.setItem(
      getDraftKey(userKey),
      JSON.stringify({ ...draft, updatedAt: Date.now() }),
    );
  } catch {
    // Abaikan
  }
}

function clearLocalDraft(userKey: string): void {
  try {
    localStorage.removeItem(getDraftKey(userKey));
  } catch {
    // abai
  }
}

/**
 * Verify that Link_XLSX has been saved to database and contains valid Drive link.
 * Poll /api/laporan/{laporanId}/wa-link endpoint until Link_XLSX is populated (max 5 retries, 2s interval).
 * 
 * Returns:
 *   - laporanId if verification succeeds and Link_XLSX is a valid Drive link
 *   - throws error if verification fails after all retries
 */
async function verifyXlsxLinkSaved(
  laporanId: string,
  cabangId: string,
  maxRetries: number = 5,
  intervalMs: number = 2000
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use /api/laporan/{laporanId}/wa-link endpoint which is available
      const res = await fetch(`/api/laporan/${laporanId}/wa-link?cabang=${cabangId}`, { credentials: 'include' });
      // Ensure we received JSON; otherwise treat as not ready
      let json: any = null;
      try {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error('Non‑JSON or error response');
        }
        json = await res.json();
      } catch {
        json = null;
      }

      if (json && json.success && json.data?.laporan?.Link_XLSX) {
        const link = json.data.laporan.Link_XLSX;
        // Accept Drive link OR in-app web view link
        if (
          link.includes('drive.google.com') ||
          link.includes('drivesdk') ||
          link.includes('/laporan/view/')
        ) {
          return laporanId;
        }
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
  }
  
  throw new Error(`Link_XLSX tidak terupdate di database setelah ${maxRetries} percobaan`);
}

// ─────────────────────────────────────────────────────────────
// Item row — diekstrak & di-memo agar setiap keystroke tidak
// me-render ulang seluruh daftar item (~130 baris).
// ─────────────────────────────────────────────────────────────

type SOField = 'step1' | 'step2' | 'keterangan' | 'statusIsi' | 'tglRefill' | 'tglPakai';

interface SOSingleCount {
  step1: string;
  step2: string;
  keterangan: string;
  statusIsi?: string;
  tglRefill?: string;
  tglPakai?: string;
}

function getStatusBadgeModule(total: number, thresholdRaw: unknown) {
  let threshold: number | null = null;
  if (thresholdRaw !== undefined && thresholdRaw !== null && String(thresholdRaw).trim() !== '') {
    const s = String(thresholdRaw).replace(',', '.').trim();
    const n = parseFloat(s);
    if (!isNaN(n)) threshold = n;
  }

  if (threshold === null || threshold < 0) {
    return (
      <span className="badge badge-ghost text-xs font-medium gap-1">
        <HelpCircle className="w-3 h-3" />
        <span>Tidak Dipantau</span>
      </span>
    );
  }
  if (total <= threshold) {
    return (
      <span className="badge badge-error text-xs font-bold gap-1">
        <AlertCircle className="w-3 h-3" />
        <span>Kritis</span>
      </span>
    );
  }
  if (threshold > 0 && total <= threshold * 2) {
    return (
      <span className="badge badge-warning text-xs font-bold gap-1">
        <AlertCircle className="w-3 h-3" />
        <span>Hampir Habis</span>
      </span>
    );
  }
  return (
    <span className="badge badge-success text-xs font-bold gap-1">
      <CheckCircle2 className="w-3 h-3" />
      <span>Aman</span>
    </span>
  );
}

const SOItemRow = React.memo(function SOItemRow({
  item,
  indexLabel,
  count,
  prev,
  onChange,
}: {
  item: MasterItem;
  indexLabel: number | string;
  count: SOSingleCount | undefined;
  prev: PreviousSO | undefined;
  onChange: (itemId: string, field: SOField, value: string | undefined) => void;
}) {
  const step1Val = count?.step1 || '';
  const step2Val = count?.step2 || '';
  const keteranganVal = count?.keterangan || '';
  const statusIsiVal = count?.statusIsi;
  const total = (Number(step1Val) || 0) + (Number(step2Val) || 0);

  const hasPrev = Boolean(prev);
  const tipeInput: InputTipe[] = parseTipeInput(item.Tipe_Input);
  const isDual = hasTipe(tipeInput, 'dual');
  const isSingle = hasTipe(tipeInput, 'single');
  const isBoolean = hasTipe(tipeInput, 'boolean');
  const isDate = hasTipe(tipeInput, 'date');
  const isExpiry = hasTipe(tipeInput, 'expiry');
  const isText = hasTipe(tipeInput, 'text');
  const primary = tipeInput[0]; // primary type untuk status badge

  // Nilai efektif: langsung dari input user (tanpa auto-fill dari prev).
  const effStatus = statusIsiVal || '';
  const statusSel = statusIsiVal || '';
  const effRefill = count?.tglRefill || '';
  const effPakai = count?.tglPakai || '';

  return (
    <div
      data-item-id={item.Item_ID}
      className="px-3 sm:px-4 py-2 transition-colors border-b border-base-300 hover:bg-base-200"
    >
      {/* Item header: name, satuan, threshold, status */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary">
          {indexLabel}
        </span>
        <span className="font-extrabold text-[13px] text-base-content">
          {item.Nama_Barang}
        </span>
        <span className="text-xs font-mono text-base-content/50">
          ({item.Satuan})
        </span>
        <span className="ml-auto flex items-center gap-3 flex-wrap">
          {primary === 'boolean' ? (
            effStatus === 'Penuh'
              ? <span className="badge badge-success text-xs font-bold gap-1"><CheckCircle2 className="w-3 h-3" /><span>Penuh</span></span>
              : effStatus === 'Dipakai'
                ? <span className="badge badge-warning text-xs font-bold gap-1"><AlertTriangle className="w-3 h-3" /><span>Dipakai</span></span>
                : effStatus === 'Habis'
                  ? <span className="badge badge-error text-xs font-bold gap-1"><AlertCircle className="w-3 h-3" /><span>Habis</span></span>
                  : <span className="badge badge-ghost text-xs font-bold gap-1"><HelpCircle className="w-3 h-3" /><span>Pilih...</span></span>
          ) : (
            <>
              <span className="text-xs tabular-nums text-base-content/60">
                Batas Min: <span className="font-bold text-base-content">{item.Threshold}</span>
              </span>
              {getStatusBadgeModule(total, item.Threshold)}
            </>
          )}
        </span>
      </div>

      {/* ── Numeric block: dual/single ── */}
      {(isDual || isSingle) && (
        <div className={`grid gap-1 ${isDual ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">S1</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
              <span className="text-xs font-bold tabular-nums">{prev ? prev.step1 : '–'}</span>
            </div>
          </div>
          {isDual && (
            <div>
              <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">S2</span>
              <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
                <span className="text-xs font-bold tabular-nums">{prev ? prev.step2 : '–'}</span>
              </div>
            </div>
          )}
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">Tot</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content rounded-md">
              <span className="text-xs font-extrabold tabular-nums">{prev ? prev.total : '–'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">S1</span>
            <input type="text" inputMode="decimal" placeholder="0" value={step1Val} onChange={(e) => onChange(item.Item_ID, 'step1', e.target.value)} data-onboard="so-step" aria-label={`Step 1 ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-bold tabular-nums input input-bordered rounded-md" />
          </div>
          {isDual && (
            <div>
              <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">S2</span>
              <input type="text" inputMode="decimal" placeholder="0" value={step2Val} onChange={(e) => onChange(item.Item_ID, 'step2', e.target.value)} aria-label={`Step 2 ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-bold tabular-nums input input-bordered rounded-md" />
            </div>
          )}
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/60 text-center">Tot</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-primary/10 border border-primary/30 rounded-md">
              <span className="text-xs font-extrabold tabular-nums text-primary">{total}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Boolean block ── */}
      {isBoolean && (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-2">
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">Status Sebelumnya</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
              <span className="text-xs font-bold tabular-nums">{prev?.statusIsi ? prev.statusIsi : '–'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">Nilai Saat Ini</span>
            <select value={statusSel} onChange={(e) => onChange(item.Item_ID, 'statusIsi', e.target.value || '')} aria-label={`Status ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-semibold cursor-pointer select select-bordered rounded-md">
              <option value="">Pilih...</option>
              <option value="Penuh">Penuh</option>
              <option value="Dipakai">Dipakai</option>
              <option value="Habis">Habis</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Date block ── */}
      {isDate && (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">Refill Sebelumnya</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
              <span className="text-xs font-bold tabular-nums">{prev?.tglRefill ? prev.tglRefill : '–'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">Tgl Refill</span>
            <input type="date" value={effRefill} onChange={(e) => onChange(item.Item_ID, 'tglRefill', e.target.value)} aria-label={`Tanggal refill ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-semibold tabular-nums input input-bordered rounded-md" />
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">Pakai Sebelumnya</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
              <span className="text-xs font-bold tabular-nums">{prev?.tglPakai ? prev.tglPakai : '–'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">Tgl Pakai</span>
            <input type="date" value={effPakai} onChange={(e) => onChange(item.Item_ID, 'tglPakai', e.target.value)} aria-label={`Tanggal pakai ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-semibold tabular-nums input input-bordered rounded-md" />
          </div>
        </div>
      )}

      {/* ── Expiry block ── */}
      {isExpiry && (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-2">
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-base-content/50 text-center">Exp Sebelumnya</span>
            <div className="w-full min-h-[44px] px-1 text-center flex items-center justify-center bg-base-200 border border-base-300 text-base-content/60 rounded-md">
              <span className="text-xs font-bold tabular-nums">{prev?.tglRefill ? prev.tglRefill : '–'}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs mb-0 font-semibold uppercase tracking-wide text-primary text-center">Tgl Kedaluwarsa</span>
            <input type="date" value={effRefill} onChange={(e) => onChange(item.Item_ID, 'tglRefill', e.target.value)} aria-label={`Tanggal kedaluwarsa ${item.Nama_Barang}`} className="w-full min-h-[44px] px-1 text-center text-xs font-semibold tabular-nums input input-bordered rounded-md" />
          </div>
        </div>
      )}

      {/* Prev session date/shift + Keterangan (Optional Notes) */}
      <div className="mt-1 flex items-center gap-3 flex-wrap">
        {hasPrev && (
          <span className="text-xs text-base-content/50">
            SO Sebelumnya: {prev?.tanggal} ({prev?.shift})
          </span>
        )}
        <div data-onboard="so-keterangan" className="relative flex-1 min-w-[160px]">
          <StickyNote
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/50"
          />
          <input
            type="text"
            placeholder={prev?.keterangan ? `Default: ${prev.keterangan}` : 'Keterangan (opsional)...'}
            value={keteranganVal}
            onChange={(e) => onChange(item.Item_ID, 'keterangan', e.target.value)}
            aria-label={`Keterangan ${item.Nama_Barang}`}
            className="w-full pl-8 pr-3 py-2 min-h-[44px] text-xs text-center input input-bordered"
          />
        </div>
      </div>
      {hasPrev && (
        <div className="mt-1.5 px-2.5 py-1 rounded-md bg-base-200 border border-base-300/80 flex items-center gap-2 text-xs">
          <span className="font-semibold text-base-content/60">Keterangan SO Sebelumnya:</span>
<span className="font-medium text-base-content/90 italic">
              {prev?.keterangan ? prev.keterangan : '(tidak ada)'}
            </span>
        </div>
      )}
    </div>
  );
});

export default function InputSOPage() {
  const router = useRouter();
  const { selectedCabang, setSelectedCabang, cabangList, loading: cabangLoading } = useCabang();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [previousSO, setPreviousSO] = useState<Record<string, PreviousSO>>({});
  const [previousSOInfo, setPreviousSOInfo] = useState<{ tanggal: string; shift: string; petugas?: string; waktu?: string } | null>(null);
  const [previousSOHistory, setPreviousSOHistory] = useState<Array<{
    sesiId: string;
    tanggal: string;
    shift: string;
    petugas: string;
    waktu: string;
    items: Record<string, PreviousSO>;
  }>>([]);
  const [selectedPrevIndex, setSelectedPrevIndex] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Form State
  const [tanggalOperasional, setTanggalOperasional] = useState<string>(() => {
    return todayLocalISO();
  });
  const [shift, setShift] = useState<string>('Opening');

  // Inputs: { [itemId]: { step1: string, step2: string, keterangan: string, statusIsi: string, tglRefill: string, tglPakai: string } }
  const [counts, setCounts] = useState<Record<string, { step1: string; step2: string; keterangan: string; statusIsi?: string; tglRefill?: string; tglPakai?: string }>>({});
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [genStep, setGenStep] = useState<SOGerStep>('simpan');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitResult, setSubmitResult] = useState<string>('');

  const sesiIdRef = useRef<string>('');
  const submittingRef = useRef<boolean>(false);
  const itemsSectionRef = useRef<HTMLDivElement>(null);

  const [lastEditedItemId, setLastEditedItemId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('Semua');

  // Petugas = logged-in user name
  const petugas = user?.nama || 'Tidak diketahui';

  // Summary modal state
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [pendingPayload, setPendingPayload] = useState<SOFormState | null>(null);

  // Gate Modal State: Selalu buka modal saat pertama kali halaman /so/input diakses
  const [showGate, setShowGate] = useState<boolean>(true);
  const [pendingDraft, setPendingDraft] = useState<SODraft | null>(null);
  const draftTimer = useRef<number | null>(null);
  const cloudSyncTimer = useRef<number | null>(null);

  const currentUserKey = user?.username || user?.nama || 'guest';

  // Load draft (Hybrid: Cek LocalStorage -> Fallback Server API)
  useEffect(() => {
    if (!currentUserKey || currentUserKey === 'guest') return;

    const localDraft = loadLocalDraft(currentUserKey);
    if (localDraft && countFilled(localDraft.counts) > 0) {
      setPendingDraft(localDraft);
    } else {
      // Fallback ke server API jika lokal kosong
      fetch('/api/so/draft')
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && resData.data?.draftJson) {
            try {
              const serverDraft = JSON.parse(resData.data.draftJson) as SODraft;
              if (serverDraft && countFilled(serverDraft.counts) > 0) {
                setPendingDraft(serverDraft);
                saveLocalDraft(currentUserKey, serverDraft);
              } else {
                setPendingDraft(null);
              }
            } catch {
              setPendingDraft(null);
            }
          } else {
            setPendingDraft(null);
          }
        })
        .catch(() => {
          setPendingDraft(null);
        });
    }
  }, [currentUserKey]);

  const handleRestoreDraft = (draft: SODraft) => {
    if (draft.sesiId) sesiIdRef.current = draft.sesiId;
    if (draft.tanggalOperasional) setTanggalOperasional(draft.tanggalOperasional);
    if (draft.shift) setShift(draft.shift);
    if (draft.note) setNote(draft.note);
    setCounts((prev) => {
      const merged = { ...prev };
      Object.keys(draft.counts).forEach((k) => {
        const dc = draft.counts[k];
        if (
          dc &&
          (String(dc.step1).trim() !== '' ||
            String(dc.step2).trim() !== '' ||
            String(dc.keterangan).trim() !== '' ||
            dc.statusIsi !== undefined ||
            String(dc.tglRefill ?? '').trim() !== '' ||
            String(dc.tglPakai ?? '').trim() !== '')
        ) {
          merged[k] = { ...dc };
        }
      });
      return merged;
    });
    setPendingDraft(null);
    setShowGate(false);
  };

  const handleDiscardDraft = () => {
    if (currentUserKey) {
      clearLocalDraft(currentUserKey);
      fetch('/api/so/draft', { method: 'DELETE' }).catch(() => {});
    }
    setPendingDraft(null);
    setNote('');
  };

  const handleConfirmNewSession = (newCabangId: string, newShift: string) => {
    const target = cabangList.find((c) => c.Cabang_ID === newCabangId);
    if (target) setSelectedCabang(target);
    setShift(newShift);
    try {
      sessionStorage.setItem('stokis_so_last_shift', newShift);
    } catch {
      // ignore
    }
    setShowGate(false);
  };

  useEffect(() => {
    if (!selectedCabang) {
      setLoadingData(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        setErrorMsg('');

        const [resItems, resPrevious] = await Promise.all([
          fetch(`/api/master-item?cabang=${selectedCabang.Cabang_ID}`),
          // FIX: kirim cabangId agar GAS bisa resolve spreadsheet yang benar
          fetch(`/api/so/previous?cabang=${selectedCabang.Cabang_ID}`),
        ]);

        const dataItems = await resItems.json();
        const dataPrevious = await resPrevious.json();

        if (dataItems.success && Array.isArray(dataItems.data)) {
          setItems(dataItems.data);
           const initialCounts: Record<string, { step1: string; step2: string; keterangan: string; statusIsi?: string; tglRefill?: string; tglPakai?: string }> = {};
          dataItems.data.forEach((item: MasterItem) => {
            initialCounts[item.Item_ID] = { step1: '', step2: '', keterangan: '', statusIsi: undefined, tglRefill: '', tglPakai: '' };
          });
          setCounts(initialCounts);
        }

        if (dataPrevious.success && dataPrevious.data) {
          const history = Array.isArray(dataPrevious.data.history)
            ? dataPrevious.data.history
            : [];
          setPreviousSOHistory(history);

          // Default to the most recent session
          setSelectedPrevIndex(0);
          setPreviousSO(
            history[0]?.items ||
              dataPrevious.data.items ||
              {}
          );
          if (history[0] || dataPrevious.data.latest) {
            const ref = history[0]?.tanggal
              ? history[0]
              : dataPrevious.data.latest;
            setPreviousSOInfo({
              tanggal: ref.tanggal,
              shift: ref.shift,
              petugas: ref.petugas || '',
              waktu: ref.waktu || '',
            });
          }
        }
      } catch (err) {
        setErrorMsg('Gagal memuat data: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [selectedCabang]);

  // Autosave draft (Hybrid: LocalStorage 400ms + Cloud API Backup 1500ms)
  const cabangId = selectedCabang?.Cabang_ID || null;
  useEffect(() => {
    if (!currentUserKey || currentUserKey === 'guest') return;
    if (items.length === 0 || pendingDraft) return;

    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current);

    draftTimer.current = window.setTimeout(() => {
      const isFilled = countFilled(counts) > 0;
      if (isFilled) {
        const draftPayload: SODraft = {
          counts,
          sesiId: sesiIdRef.current,
          tanggalOperasional,
          shift,
          note,
          updatedAt: Date.now(),
        };
        saveLocalDraft(currentUserKey, draftPayload);

        // Sync ke cloud server API (di-debounce 1500ms)
        cloudSyncTimer.current = window.setTimeout(() => {
          if (!cabangId) return;
          fetch('/api/so/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cabangId,
              shift,
              draftJson: JSON.stringify(draftPayload),
            }),
          }).catch(() => {});
        }, 1100);
      } else {
        clearLocalDraft(currentUserKey);
        fetch('/api/so/draft', { method: 'DELETE' }).catch(() => {});
      }
    }, 400);
  }, [counts, tanggalOperasional, shift, note, cabangId, items.length, pendingDraft, currentUserKey]);

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current);
    };
  }, []);

  // Peringatkan user jika menutup/me-refresh halaman saat ada data yang belum disubmit
  const hasDirtyData = useMemo(() => {
    if (submitting) return false;
    return countFilled(counts) > 0 || note.trim() !== '';
  }, [counts, note, submitting]);

  const filledCount = useMemo(() => countFilled(counts), [counts]);
  const fillPercent = items.length > 0 ? Math.round((filledCount / items.length) * 100) : 0;

  useEffect(() => {
    if (!hasDirtyData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDirtyData]);

  // Track if user is at bottom of items section (for submit button visibility)
  useEffect(() => {
    const container = itemsSectionRef.current;
    if (!container) return;

    const checkIfAtBottom = () => {
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Show submit when items section bottom is within 200px of viewport bottom
      const distanceFromBottom = rect.bottom - viewportHeight;
      setIsAtBottom(distanceFromBottom < 200);
    };

    window.addEventListener('scroll', checkIfAtBottom, { passive: true });
    // Check initially
    checkIfAtBottom();

    return () => window.removeEventListener('scroll', checkIfAtBottom);
  }, [items.length]);

  // Choose which previous SO session to use as reference (dropdown)
  const handleSelectPrevious = (index: number) => {
    const session = previousSOHistory[index];
    if (session) {
      setSelectedPrevIndex(index);
      setPreviousSO(session.items || {});
      setPreviousSOInfo({ tanggal: session.tanggal, shift: session.shift, petugas: session.petugas || '', waktu: session.waktu || '' });
    }
  };

  // Extract unique areas from items
  const areas = useMemo(() => {
    const areaSet = new Set(items.map(i => i.Area || 'Area Umum'));
    return Array.from(areaSet).sort();
  }, [items]);

  // Filter items by area and search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesArea = selectedArea === 'Semua' || (item.Area || 'Area Umum') === selectedArea;
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        item.Nama_Barang.toLowerCase().includes(query) ||
        item.Item_ID.toLowerCase().includes(query);
      return matchesArea && matchesSearch;
    });
  }, [items, selectedArea, searchQuery]);

  const globalIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((item, idx) => { map[item.Item_ID] = idx + 1; });
    return map;
  }, [filteredItems]);

  // Stabil via useCallback agar React.memo pada SOItemRow berfungsi.
  const handleCountChange = useCallback((itemId: string, field: SOField, value: string | undefined) => {
    const nextValue =
      field === 'step1' || field === 'step2'
        ? sanitizeDecimalInput(String(value ?? ''))
        : value;
    setCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: nextValue,
      },
    }));
    if (field !== 'keterangan') {
      setLastEditedItemId(itemId);
    }
    setErrorMsg((m) => (m ? '' : m));
  }, []);

  if (cabangLoading || loadingData) {
    return <QuantumLoaderFull text="Menyiapkan formulir SO" />;
  }

  if (!selectedCabang) {
    return (
      <div className="text-center py-16 card bg-base-100 border border-base-300 rounded-3xl p-8 space-y-3">
        <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
        <h3 className="text-base font-bold text-base-content">Pilih Cabang Terlebih Dahulu</h3>
        <p className="text-base-content/60 text-sm">Silakan pilih cabang aktif melalui switcher di bagian atas navigasi.</p>
      </div>
    );
  }

  // Group filtered items by Area
  const groupedItems = filteredItems.reduce((acc, item) => {
    const area = item.Area || 'Area Umum';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {} as Record<string, MasterItem[]>);

  const buildPayloadItems = (): SOItemPayload[] => {
    return items.map((it) => {
      const c = counts[it.Item_ID] || { step1: '', step2: '', keterangan: '', statusIsi: undefined, tglRefill: '', tglPakai: '' };
      const prev = previousSO[it.Item_ID] || previousSO[it.Nama_Barang] || previousSO[it.Nama_Barang.trim()];
      const step1Str = String(c.step1).trim();
      const step2Str = String(c.step2).trim();
      const step1Num = Number(step1Str);
      const step2Num = Number(step2Str);
      // Tidak ada auto-fill: kosong = 0
      const step1 = step1Str === '' || !Number.isFinite(step1Num) ? 0 : step1Num;
      const step2 = step2Str === '' || !Number.isFinite(step2Num) ? 0 : step2Num;
      const total = step1 + step2;
      const prevKeterangan = prev?.keterangan || '';
      const keterangan = c.keterangan.trim();

      // boolean/date — tanpa auto-fill dari prev
      const tglRefillInput = (c.tglRefill || '').trim();
      const tglRefill = tglRefillInput || '';

      let statusIsi: 'Penuh' | 'Dipakai' | 'Habis' | '';
      if (c.statusIsi !== undefined && c.statusIsi !== '') {
        statusIsi = c.statusIsi as 'Penuh' | 'Dipakai' | 'Habis';
      } else {
        statusIsi = '';
      }

      const tglPakaiInput = (c.tglPakai || '').trim();
      const tglPakai = tglPakaiInput || '';

      return {
        itemId: it.Item_ID,
        namaBarang: it.Nama_Barang,
        satuan: it.Satuan,
        area: it.Area,
        threshold: it.Threshold,
        tipeInput: it.Tipe_Input || '',
        step1,
        step2,
        total,
        keterangan,
        prevStep1: prev?.step1 ?? null,
        prevStep2: prev?.step2 ?? null,
        prevTotal: prev?.total ?? null,
        prevTanggal: prev?.tanggal ?? null,
        prevShift: prev?.shift ?? null,
        prevKeterangan,
        statusIsi,
        tglRefill,
        tglPakai,
        prevStatusIsi: prev?.statusIsi ?? null,
        prevTglRefill: prev?.tglRefill ?? null,
        prevTglPakai: prev?.tglPakai ?? null,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sesiIdRef.current) {
      sesiIdRef.current = generateSesiId();
    }

    // Validasi: semua field wajib diisi sesuai tipe input
    const emptyFields: string[] = [];
    items.forEach((it) => {
      const c = counts[it.Item_ID];
      const tipe = parseTipeInput(it.Tipe_Input);
      const primary = tipe[0];

      if (primary === 'dual' || primary === 'single') {
        if (!c?.step1?.trim()) emptyFields.push(`${it.Nama_Barang}: S1 kosong`);
        if (primary === 'dual' && !c?.step2?.trim()) emptyFields.push(`${it.Nama_Barang}: S2 kosong`);
      }
      if (tipe.includes('boolean')) {
        if (!c?.statusIsi) emptyFields.push(`${it.Nama_Barang}: Status Isi belum dipilih`);
      }
      if (tipe.includes('date')) {
        if (!c?.tglRefill?.trim()) emptyFields.push(`${it.Nama_Barang}: Tgl Refill kosong`);
      }
      if (tipe.includes('expiry')) {
        if (!c?.tglRefill?.trim()) emptyFields.push(`${it.Nama_Barang}: Tgl Kedaluwarsa kosong`);
      }
    });

    if (emptyFields.length > 0) {
      const preview = emptyFields.slice(0, 5).join('\n');
      const more = emptyFields.length > 5 ? `\n... dan ${emptyFields.length - 5} lainnya` : '';
      toast.error('Wajib isi semua kolom:', `${preview}${more}`);
      return;
    }

    const payloadItems = buildPayloadItems();
    const formState: SOFormState = {
      sesiId: sesiIdRef.current,
      tanggalOperasional,
      shift,
      petugas,
      items: payloadItems,
      cabangNama: selectedCabang.Nama_Cabang,
      cabangKode: selectedCabang.Cabang_ID,
      note,
    };
    setPendingPayload(formState);
    setShowSummary(true);
  };

  const handleConfirmedSubmit = async (formState: SOFormState) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setSubmitting(true);
      setShowSummary(false);
      setErrorMsg('');
      setSubmitResult('');
      setGenStep('simpan');

      const body = {
        cabangId: selectedCabang.Cabang_ID,
        sesiId: formState.sesiId,
        tanggalOperasional: formState.tanggalOperasional,
        shift: formState.shift,
        petugas: formState.petugas,
        items: formState.items,
        note: formState.note || '',
      };

      // Retry aman: payload memakai sesiId yang sama → idempotent di backend
      const { result } = await postWithRetry('/api/so', body, 3);

      if (result.error) {
        toast.error('Gagal Menyimpan', result.error.message || 'Gagal menyimpan data stock opname');
        return;
      }
      if (!result.success) {
        toast.error('Gagal Menyimpan', 'Gagal menyimpan data stock opname');
        return;
      }

      const data = result.data;
      const alreadyProcessed = data?.status === 'already_processed';
      const rowsWritten: number =
        typeof data?.rows_written === 'number' ? data.rows_written : formState.items.length;

      let laporanId = data?.laporanId || null;

      setSubmitResult(
        alreadyProcessed
          ? `Sesi ${formState.sesiId} sudah pernah diproses (${rowsWritten} item). Tidak ada data ganda yang dibuat.`
          : `${rowsWritten} item berhasil disimpan.`
      );

      // Buat catatan laporan secara langsung, terlepas dari upload Drive,
      // agar halaman konfirmasi/berbagi selalu punya laporanId yang valid.
      setGenStep('laporan');
      try {
        const laporanRes = await fetch(`/api/so/${laporanId || formState.sesiId}/save-laporan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cabangId: selectedCabang.Cabang_ID,
            sesiId: formState.sesiId,
            tanggalOperasional: formState.tanggalOperasional,
            shift: formState.shift,
            petugas: formState.petugas,
            items: formState.items,
            previousSOInfo,
            note: formState.note || '',
          }),
        });
        const laporanJson = await laporanRes.json().catch(() => null);
        const savedLaporanId = laporanJson?.data?.laporanId;
        if (typeof savedLaporanId === 'string' && savedLaporanId) {
          laporanId = savedLaporanId;
        }
      } catch {
        // catatan laporan bersifat non-critical; laporanId fallback ke sesiId
      }

      // Generate XLSX dan simpan ke Drive - HARUS SELESAI sebelum redirect
      setGenStep('xlsx');
      try {
        const xlsxRes = await fetch(`/api/so/${laporanId || formState.sesiId}/xlsx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: formState.items,
            cabangId: selectedCabang.Cabang_ID,
            cabangNama: formState.cabangNama,
            cabangKode: formState.cabangKode,
            tanggalOperasional: formState.tanggalOperasional,
            shift: formState.shift,
            petugas: formState.petugas,
            previousSOInfo,
            sesiId: formState.sesiId,
            note: formState.note || '',
          }),
        });
        
        // PENTING: Tunggu XLSX benar-benar selesai di-generate dan di-upload
        await xlsxRes.blob();
      } catch {
        // Tetap lanjut ke halaman konfirmasi meski XLSX gagal (non-critical)
      }

      // Verify Link_XLSX was saved before redirecting
      setGenStep('verifikasi');
      try {
        const verifiedLaporanId = await verifyXlsxLinkSaved(
          laporanId || formState.sesiId,
          selectedCabang.Cabang_ID
        );
        setGenStep('selesai');
        router.push(`/so/konfirmasi/${verifiedLaporanId}`);
      } catch {
        // Verification failed, but still redirect - UI will show error badge
        setGenStep('selesai');
        router.push(`/so/konfirmasi/${laporanId || formState.sesiId}`);
      }

      // Submit sukses → hapus draft sementara (Lokal & Cloud)
      if (currentUserKey) {
        clearLocalDraft(currentUserKey);
        fetch('/api/so/draft', { method: 'DELETE' }).catch(() => {});
        setPendingDraft(null);
      }
    } catch (err) {
      toast.error(
        'Kendala Jaringan',
        'Terjadi kendala jaringan setelah beberapa percobaan: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const activeFilterCount = (selectedArea !== 'Semua' ? 1 : 0) + (searchQuery ? 1 : 0);

  const scrollTo = (selector: string) => {
    const container = itemsSectionRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToFirstItem = () => {
    scrollTo('[data-item-id]');
  };

  const scrollToLastEditedItem = () => {
    if (!lastEditedItemId) {
      toast.warning('Belum Ada Item Filled', 'Isi minimal satu kolom terlebih dahulu.');
      return;
    }
    scrollTo(`[data-item-id="${lastEditedItemId}"]`);
  };

  const scrollToLastItem = () => {
    const container = itemsSectionRef.current;
    if (!container) return;
    const itemEls = Array.from(container.querySelectorAll<HTMLElement>('[data-item-id]'));
    const last = itemEls[itemEls.length - 1];
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Cegah Enter mengirim form dari input/textarea/select biasa
          // (search, keterangan, dsb). Tombol submit tetap berfungsi normal.
          if (e.key === 'Enter') {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
              e.preventDefault();
            }
          }
        }}
        className="space-y-6 max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6"
      >
        {errorMsg ? (
          <div role="alert" className="alert alert-error text-sm whitespace-pre-line">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Draft restore banner - hidden since we now use modal */}

        {/* Session Metadata Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card bg-base-100 border border-base-300 p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-base-300">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-shrink-0 p-2 -ml-1 rounded-lg text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Kembali ke halaman sebelumnya"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 data-onboard="so-input-heading" className="text-lg font-semibold tracking-tight text-base-content">
                  Formulir Input Stock Opname
                </h1>
                <p className="text-sm text-base-content/60">
                  Lokasi Cabang: <button type="button" onClick={() => setShowGate(true)} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">{selectedCabang.Nama_Cabang} ({shift})</button>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/docs/user-guide/stock-opname"
                className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-primary"
                title="Buka panduan Input SO"
              >
                <HelpCircle className="w-4 h-4" />
              </a>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-base-200 text-base-content/60 border border-base-300">
                <Hash className="w-3.5 h-3.5" />
                <span>{filteredItems.length} / {items.length} Item</span>
              </div>
            </div>
          </div>

          {/* Progres pengisian item */}
          <div className="space-y-1" role="progressbar" aria-label="Progres pengisian item" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={filledCount} aria-valuetext={`${filledCount} dari ${items.length} item terisi`}>
            <div className="flex items-center justify-between text-xs font-medium text-base-content/60">
              <span>{filledCount} dari {items.length} item terisi</span>
              <span className="tabular-nums">{fillPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-base-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tanggal Operasional */}
            <div data-onboard="so-tanggal" className="space-y-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Tanggal Operasional</span>
              </label>
              <input
                type="date"
                value={tanggalOperasional}
                onChange={(e) => setTanggalOperasional(e.target.value)}
                required
                aria-label="Tanggal Operasional"
                className="w-full px-3 py-2.5 text-sm font-medium tabular-nums text-center input input-bordered"
              />
            </div>

            {/* Shift */}
            <div data-onboard="so-shift" className="space-y-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Shift Kerja</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                aria-label="Shift Kerja"
                className="w-full px-3 py-2.5 text-sm font-medium cursor-pointer text-center select select-bordered"
              >
                <option value="Opening">Opening</option>
                <option value="Closing">Closing</option>
              </select>
            </div>

            {/* Petugas — dari login, read-only */}
            <div data-onboard="so-petugas" className="space-y-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Petugas</span>
              </label>
              <div className="w-full px-3 py-2.5 text-sm font-semibold flex items-center gap-2 min-h-[42px] bg-base-200 border border-base-300 text-base-content">
                <BadgeCheck className="w-4 h-4 flex-shrink-0 text-success" />
                <span>{petugas}</span>
                <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-md badge badge-success">
                  Login
                </span>
              </div>
            </div>
          </div>

          {/* Previous SO Reference Selector */}
          <div data-onboard="so-previous" className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Acuan SO Sebelumnya</span>
              </label>
              <span className="text-xs font-medium text-base-content/40">
                (dipakai sebagai pembanding stok)
              </span>
            </div>

            {previousSOHistory.length > 0 ? (
              <select
                value={selectedPrevIndex}
                onChange={(e) => handleSelectPrevious(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm font-medium cursor-pointer text-center select select-bordered"
                aria-label="Pilih sesi SO sebelumnya sebagai acuan"
              >
                {previousSOHistory.map((s, i) => (
                  <option key={s.sesiId} value={i}>
                    {i === 0 ? 'Terbaru' : `Sesi #${previousSOHistory.length - i}`} · {s.tanggal} · {s.shift}
                    {s.petugas ? ` · ${s.petugas}` : ''}
                    {i === 0 ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-base-200 border border-base-300 text-base-content/60">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Belum ada data SO sebelumnya untuk cabang ini.</span>
              </div>
            )}

            {previousSOInfo && previousSOHistory.length > 0 && (
              <p className="text-xs text-base-content/50">
                Acuan aktif: <strong>{previousSOInfo.tanggal}</strong> · Shift{' '}
                <strong>{previousSOInfo.shift}</strong>
              </p>
            )}
          </div>
        </motion.div>

        {/* Filter & Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="sticky top-16 z-40 card bg-base-100/95 backdrop-blur-md border border-base-300 shadow-md p-4 space-y-3"
        >
          <div className="flex flex-row gap-2">
            {/* Search */}
            <div data-onboard="so-search" className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari barang"
                className="w-full pl-9 pr-10 py-2.5 text-sm min-h-[44px] input input-bordered"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-base-content/50 hover:text-base-content transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Area Filter */}
            <div data-onboard="so-area" className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-base-content/50" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                aria-label="Filter area"
                className="pl-9 pr-8 py-2.5 text-sm font-medium cursor-pointer min-h-[44px] select select-bordered"
              >
                <option value="Semua">Semua Area</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="text-xs font-semibold text-base-content/60">Filter aktif:</span>
                {selectedArea !== 'Semua' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md badge badge-primary">
                    <Layers className="w-3 h-3" />
                    {selectedArea}
                    <button
                      type="button"
                      onClick={() => setSelectedArea('Semua')}
                      aria-label={`Hapus filter area ${selectedArea}`}
                      className="p-1.5 -m-1.5 flex items-center justify-center min-h-[24px] min-w-[24px]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md badge badge-primary">
                    <Search className="w-3 h-3" />
                    &quot;{searchQuery}&quot;
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Hapus pencarian"
                      className="p-1.5 -m-1.5 flex items-center justify-center min-h-[24px] min-w-[24px]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedArea('Semua'); setSearchQuery(''); }}
                  className="text-xs font-medium underline text-base-content/50"
                >
                  Hapus semua
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Items Section by Area */}
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-12 card bg-base-100 border border-base-300 p-6 text-base-content/60">
            <p className="text-sm">
              {items.length === 0
                ? 'Belum ada item terdaftar pada master barang cabang ini.'
                : 'Tidak ada item yang cocok dengan filter atau pencarian.'
              }
            </p>
          </div>
        ) : (
          <motion.div
            ref={itemsSectionRef}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4 sm:pr-16 sm:ml-auto"
          >
            {Object.entries(groupedItems).map(([area, areaItems]) => (
              <motion.div key={area} variants={staggerItem} className="card bg-base-100 border border-base-300 overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between bg-base-200 border-b border-base-300">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content">
                      {area}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-base-content/60">
                    {areaItems.length} Item
                  </span>
                </div>

                <div className="border-t border-base-300">
                  {areaItems.map((item) => (
                    <SOItemRow
                      key={item.Item_ID}
                      item={item}
                      indexLabel={globalIndexMap[item.Item_ID]}
                      count={counts[item.Item_ID]}
                      prev={previousSO[item.Item_ID] || previousSO[item.Nama_Barang] || previousSO[item.Nama_Barang.trim()]}
                      onChange={handleCountChange}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Note laporan (opsional) */}
        <div className="card bg-base-100 border border-base-300 p-3 sm:p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-base-content mb-1.5">
            <StickyNote className="w-4 h-4 text-base-content/50" />
            Catatan Laporan
            <span className="text-xs font-normal text-base-content/40">(opsional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tulis catatan untuk laporan ini, mis. kondisi terakhir, hal yang perlu ditindaklanjuti, dsb..."
            rows={3}
            aria-label="Catatan laporan"
            className="w-full textarea textarea-bordered resize-y text-sm"
          />
        </div>

        {/* Floating Action Bar — only show when at bottom of items */}
        {isAtBottom && (
          <div data-onboard="so-submit" className="card bg-base-100 border border-base-300 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md pb-[calc(72px+env(safe-area-inset-bottom))]">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-base-content/60">
                Selesaikan sesi pencatatan
              </span>
              <p className="text-sm font-semibold text-base-content">
                Laporan XLSX akan dibuat & link Drive siap dibagikan
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
            >
              {submitting ? (
                <>
                  <QuantumLoaderMini />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Simpan & Buat Laporan</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Floating navigation rail — vertical, right-center */}
      <div data-onboard="so-navrail" className="flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-1.5">
        <button
          type="button"
          onClick={scrollToFirstItem}
          className="w-9 h-9 flex items-center justify-center bg-primary rounded-full hover:bg-primary/80 transition-colors shadow"
          title="Ke item paling atas"
          aria-label="Ke item paling atas"
        >
          <ArrowUp className="w-4 h-4 text-white" />
        </button>
        <button
          type="button"
          onClick={scrollToLastEditedItem}
          className={`w-9 h-9 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity shadow ${lastEditedItemId ? 'bg-warning' : 'bg-primary'}`}
          title="Ke item terakhir yang diisi"
          aria-label="Ke item terakhir yang diisi"
        >
          <Pencil className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          type="button"
          onClick={scrollToLastItem}
          className="w-9 h-9 flex items-center justify-center bg-primary rounded-full hover:bg-primary/80 transition-colors shadow"
          title="Ke item paling bawah"
          aria-label="Ke item paling bawah"
        >
          <ArrowDown className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Summary Modal rendered separately */}
      <AnimatePresence>
        {showSummary && pendingPayload && (
          <SOSummaryModalInline
            formState={pendingPayload}
            onConfirm={() => handleConfirmedSubmit(pendingPayload)}
            onCancel={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>

      {/* Generating overlay shown saat submit berlangsung */}
      <AnimatePresence>
        {submitting && <SOGeneratingOverlay step={genStep} />}
      </AnimatePresence>

      {/* Shift & Cabang Gate Modal */}
      <ShiftCabangGate
        open={showGate}
        cabangList={cabangList}
        initialCabangId={selectedCabang?.Cabang_ID ?? null}
        initialShift={shift}
        pendingDraft={pendingDraft}
        countFilledDraft={countFilled}
        onRestoreDraft={() => pendingDraft && handleRestoreDraft(pendingDraft)}
        onDiscardDraft={handleDiscardDraft}
        onConfirmNewSession={handleConfirmNewSession}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline Summary Modal (lives here to share SOFormState types)
// ─────────────────────────────────────────────────────────────

function SOSummaryModalInline({
  formState,
  onConfirm,
  onCancel,
}: {
  formState: SOFormState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const kritis = formState.items.filter(i => i.threshold > 0 && (i.step1 + i.step2) <= i.threshold);
  const hampirHabis = formState.items.filter(i => i.threshold > 0 && (i.step1 + i.step2) > i.threshold && (i.step1 + i.step2) <= i.threshold * 2);
  const aman = formState.items.filter(i => i.threshold > 0 && (i.step1 + i.step2) > i.threshold * 2);
  const tidakDipantau = formState.items.filter(i => !i.threshold || i.threshold <= 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-base-100 rounded-xl border border-base-300 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base-content text-base">Ringkasan Stock Opname</h2>
              <p className="text-xs text-base-content/60">Periksa sebelum mengirimkan data</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Info */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <span className="text-xs text-base-content/60 font-semibold uppercase tracking-wide">Cabang</span>
              <p className="font-semibold text-base-content">{formState.cabangNama}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-base-content/60 font-semibold uppercase tracking-wide">Petugas</span>
              <p className="font-semibold text-base-content">{formState.petugas}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-base-content/60 font-semibold uppercase tracking-wide">Tanggal</span>
              <p className="font-semibold text-base-content tabular-nums">{formState.tanggalOperasional}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-base-content/60 font-semibold uppercase tracking-wide">Shift</span>
              <p className="font-semibold text-base-content">{formState.shift}</p>
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-lg bg-error/10 border border-error/30">
              <span className="block text-2xl font-extrabold text-error tabular-nums">{kritis.length}</span>
              <span className="text-xs font-bold text-error uppercase">Kritis</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/30">
              <span className="block text-2xl font-extrabold text-warning tabular-nums">{hampirHabis.length}</span>
              <span className="text-xs font-bold text-warning uppercase tracking-wide">H. Habis</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10 border border-success/30">
              <span className="block text-2xl font-extrabold text-success tabular-nums">{aman.length}</span>
              <span className="text-xs font-bold text-success uppercase">Aman</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-base-200 border border-base-300">
              <span className="block text-2xl font-extrabold text-base-content/60 tabular-nums">{tidakDipantau.length}</span>
              <span className="text-xs font-bold text-base-content/60 uppercase">N/A</span>
            </div>
          </div>

          {/* Critical Items List */}
          {kritis.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-error uppercase tracking-wide flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Item Kritis ({kritis.length})
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {kritis.map(item => (
                  <div key={item.itemId} className="flex items-center justify-between px-3 py-1.5 bg-error/10 rounded-lg text-xs border border-error/30">
                    <span className="font-medium text-base-content">{item.namaBarang}</span>
                    <span className="font-bold text-error tabular-nums">
                      {item.step1 + item.step2} / {item.threshold}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items with keterangan */}
          {formState.items.some(i => i.keterangan) && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-base-content/60 uppercase tracking-wide flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Keterangan Diisi
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {formState.items.filter(i => i.keterangan).map(item => (
                  <div key={item.itemId} className="flex items-start justify-between px-3 py-1.5 bg-base-200 rounded-lg text-xs border border-base-300 gap-2">
                    <span className="font-medium text-base-content flex-shrink-0">{item.namaBarang}:</span>
                    <span className="text-base-content/60 text-right">{item.keterangan}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note laporan */}
          {formState.note?.trim() && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-base-content/60 uppercase tracking-wide flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Catatan Laporan
              </span>
              <div className="px-3 py-2 bg-base-200 rounded-lg text-xs border border-base-300 whitespace-pre-wrap">
                {formState.note}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 btn px-4 py-2.5 text-sm font-medium min-h-[44px]"
          >
            Kembali & Edit
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn btn-primary px-4 py-2.5 text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Konfirmasi & Submit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
