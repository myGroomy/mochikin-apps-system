'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { useAuth } from '@/lib/AuthContext';
import {
  FileText,
  Share2,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  AlertTriangle,
  Table,
  RefreshCw,
  Loader2,
  ListOrdered,
  Pencil,
  Eye,
  FileDown,
  HelpCircle,
} from 'lucide-react';
import { WATemplateModal } from '@/components/WATemplateModal';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

interface LaporanItem {
  Laporan_ID: string;
  Sesi_ID: string;
  Tanggal_Operasional: string;
  Shift: string;
  Petugas: string;
  Waktu_Dibuat: string;
  Link_PDF: string;
  Link_XLSX: string;
  Jumlah_Kritis: number;
  Jumlah_Hampir_Habis: number;
  Status_Kirim_WA: string;
}

type SquareActionColor = 'primary' | 'info' | 'warning' | 'success' | 'neutral' | 'ghost';

interface SquareActionProps {
  href?: string;
  target?: '_blank';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  title: string;
  label: string;
  icon: React.ReactNode;
  color?: SquareActionColor;
}

const SQUARE_ACTION_STYLES: Record<SquareActionColor, string> = {
  primary: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30',
  info: 'border-info/40 bg-info/10 text-info hover:bg-info/20 active:bg-info/30',
  warning: 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/30',
  success: 'border-success/40 bg-success/10 text-success hover:bg-success/20 active:bg-success/30',
  neutral: 'border-base-content/25 bg-base-200/50 text-base-content/70 hover:bg-base-200 active:bg-base-300',
  ghost: 'border-base-300/60 bg-transparent text-base-content/50 hover:bg-base-200 active:bg-base-300',
};

function SquareAction({ href, target, onClick, disabled, loading, title, label, icon, color = 'primary' }: SquareActionProps) {
  const classes = `btn btn-xs flex-row gap-1 h-9 min-w-0 w-full px-1.5 rounded-md border font-semibold transition-colors ${SQUARE_ACTION_STYLES[color]} disabled:opacity-60 disabled:cursor-not-allowed ${loading ? 'pointer-events-none' : ''}`;

  const inner = (
    <>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="scale-100">{icon}</span>}
      <span className="text-[10px] leading-none tracking-wide">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} title={title} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} title={title} className={classes}>
      {inner}
    </button>
  );
}

function formatWaktuDibuat(value: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LaporanPage() {
  const { selectedCabang } = useCabang();
  const { isAdmin, user } = useAuth();

  const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  type UrutanLaporan = 'Area' | 'Urutan_Input' | 'Tipe_Input';
  const [urutanLaporan, setUrutanLaporan] = useState<UrutanLaporan>('Tipe_Input');
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [filterTanggal, setFilterTanggal] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [filterPetugas, setFilterPetugas] = useState<string>('');
  const [debouncedPetugas, setDebouncedPetugas] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePetugasChange = (value: string) => {
    setFilterPetugas(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedPetugas(value), 300);
  };

  const [showWATemplate, setShowWATemplate] = useState<boolean>(false);
  const [selectedLaporan, setSelectedLaporan] = useState<LaporanItem | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [totalMasterItems, setTotalMasterItems] = useState<number>(0);

  useEffect(() => {
    if (!selectedCabang?.Cabang_ID) return;
    fetch(`/api/master-item?cabang=${selectedCabang.Cabang_ID}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setTotalMasterItems(json.data.length);
        }
      })
      .catch(() => {
        // abaikan: non-kritis
      });
  }, [selectedCabang?.Cabang_ID]);
  const fetchLaporan = useCallback(async () => {
    if (!selectedCabang) return;
    try {
      setLoading(true);
      const query = new URLSearchParams({
        cabang: selectedCabang.Cabang_ID,
        ...(filterTanggal ? { tanggal: filterTanggal } : {}),
        ...(filterShift ? { shift: filterShift } : {}),
        ...(debouncedPetugas ? { petugas: debouncedPetugas } : {}),
      });

      const res = await fetch(`/api/laporan?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLaporanList([...json.data].reverse());
      }
    } catch {
      setErrorMsg('Gagal memuat laporan. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  }, [selectedCabang, filterTanggal, filterShift, debouncedPetugas]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchLaporan();
    });
  }, [fetchLaporan]);

  useEffect(() => {
    if (!isAdmin || !selectedCabang?.Cabang_ID) return;
    fetch(`/api/cabang/${selectedCabang.Cabang_ID}/settings`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.urutanLaporan) {
          setUrutanLaporan(['Area', 'Urutan_Input', 'Tipe_Input'].includes(json.data.urutanLaporan) ? json.data.urutanLaporan : 'Tipe_Input');
        }
      })
      .catch(() => {
        setSettingsMsg({ type: 'error', text: 'Gagal memuat pengaturan urutan laporan.' });
      });
  }, [isAdmin, selectedCabang?.Cabang_ID]);

  const handleUrutanLaporanChange = async (value: UrutanLaporan) => {
    if (!selectedCabang) return;
    setUrutanLaporan(value);
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      const res = await fetch(`/api/cabang/${selectedCabang.Cabang_ID}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urutanLaporan: value }),
      });
      const json = await res.json();
      if (json.success) {
        setSettingsMsg({ type: 'success', text: 'Pengaturan urutan laporan tersimpan. Berlaku untuk laporan yang dibuat ulang.' });
      } else {
        setSettingsMsg({ type: 'error', text: json.error?.message || 'Gagal menyimpan pengaturan.' });
      }
    } catch {
      setSettingsMsg({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!selectedCabang) {
    return (
      <div className="text-center py-16 card bg-base-100 border border-base-300 p-8 space-y-3">
        <ShieldAlert className="w-12 h-12 mx-auto text-warning" />
        <h3 className="text-base font-bold text-base-content">Pilih Cabang Terlebih Dahulu</h3>
        <p className="text-sm text-base-content/60">Silakan pilih cabang aktif melalui menu di navbar atas.</p>
      </div>
    );
  }

  const handleOpenWATemplate = (laporan: LaporanItem) => {
    setSelectedLaporan(laporan);
    setShowWATemplate(true);
  };

  const handleRegenerate = async (row: LaporanItem) => {
    if (!selectedCabang) return;
    setRegeneratingId(row.Laporan_ID);
    try {
      const res = await fetch(`/api/laporan/${row.Laporan_ID}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabangId: selectedCabang.Cabang_ID }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLaporanList((prev) =>
          prev.map((item) =>
            item.Laporan_ID === row.Laporan_ID
              ? {
                  ...item,
                  Link_XLSX: json.data.xlsx || item.Link_XLSX,
                }
              : item
          )
        );
      }
    } catch {
      // silent
    } finally {
      setRegeneratingId(null);
    }
  };

  const hasFilters = Boolean(filterTanggal || filterShift || filterPetugas);
  const clearFilters = () => {
    setFilterTanggal('');
    setFilterShift('');
    setFilterPetugas('');
    setDebouncedPetugas('');
  };
  const canEditRow = (row: LaporanItem) =>
    isAdmin ||
    [user?.nama, user?.username]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === String(row.Petugas || '').trim().toLowerCase());

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <motion.div
        key="header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
          <div>
            <h1 data-onboard="laporan-heading" className="text-xl sm:text-2xl font-semibold flex items-center gap-2 text-base-content">
              <FileText className="w-6 h-6 text-primary" />
              <span>Riwayat Laporan Stock Opname</span>
            </h1>
            <p className="text-sm mt-1 text-base-content/60">
              Cabang Operasional: <span className="font-semibold text-base-content">{selectedCabang.Nama_Cabang}</span>
            </p>
          </div>
          <a
            href="/docs/user-guide/laporan"
            className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-primary"
            title="Buka panduan Laporan"
          >
            <HelpCircle className="w-4 h-4" />
          </a>
        </motion.div>

        {errorMsg && (
          <div className="alert alert-error text-sm" role="alert">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => { setErrorMsg(''); fetchLaporan(); }} className="btn btn-ghost btn-xs">Coba Lagi</button>
          </div>
        )}

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.03 }}
            className="card bg-base-100 border border-base-300 p-3 sm:p-4 space-y-1.5 sm:space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div className="space-y-0.5 flex-1">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Urutan Baris Laporan</span>
                </label>
                <p className="text-xs text-base-content/50">
                  Berlaku untuk file yang dibuat ulang (Regenerate) di cabang ini.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={urutanLaporan}
                  onChange={(e) => handleUrutanLaporanChange(e.target.value as UrutanLaporan)}
                  disabled={settingsSaving}
                  className="select select-bordered min-h-[38px] sm:min-h-[42px] text-sm w-full sm:w-auto"
                >
                  <option value="Tipe_Input">Arsitektur Laporan (Default)</option>
                  <option value="Area">Per Kategori / Area</option>
                  <option value="Urutan_Input">Urutan Master Item</option>
                </select>
                {settingsSaving && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                )}
              </div>
            </div>
            {settingsMsg && (
              <div className={`text-xs font-medium ${settingsMsg.type === 'error' ? 'text-error' : 'text-success'}`}>
                {settingsMsg.text}
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="sticky top-16 z-40 card bg-base-100/95 backdrop-blur-md border border-base-300 shadow-md p-2.5 sm:p-4"
        >
          <div className="grid grid-cols-2 lg:flex lg:flex-row lg:items-end gap-1.5 sm:gap-3">
            <div className="space-y-1 flex-1">
              <label className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>Filter Tanggal</span>
              </label>
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="input input-bordered w-full min-h-[38px] sm:min-h-[42px] px-2 sm:px-3 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1 flex-1">
              <label className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <Clock className="w-3.5 h-3.5" />
                <span>Filter Shift</span>
              </label>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="select select-bordered w-full min-h-[38px] sm:min-h-[42px] px-2 sm:px-3 text-xs sm:text-sm"
              >
                <option value="">Semua Shift</option>
                <option value="Opening">Opening</option>
                <option value="Closing">Closing</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1 lg:col-span-1 flex-[1.5]">
              <label className="text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 text-base-content/60">
                <User className="w-3.5 h-3.5" />
                <span>Pencarian Petugas</span>
              </label>
              <input
                type="text"
                placeholder="Ketik nama petugas..."
                value={filterPetugas}
                onChange={(e) => handlePetugasChange(e.target.value)}
                className="input input-bordered w-full min-h-[38px] sm:min-h-[42px] px-2 sm:px-3 text-xs sm:text-sm"
              />
            </div>

            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="btn btn-ghost min-h-[38px] sm:min-h-[42px] h-auto px-2 sm:px-3 text-xs sm:text-sm col-span-2 lg:col-span-1">
                Reset filter
              </button>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-base-200 text-xs text-base-content/50">
            <span><strong className="text-base-content">{laporanList.length}</strong> laporan ditemukan</span>
            {hasFilters ? <span>Filter aktif</span> : <span>Terbaru ditampilkan lebih dulu</span>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="card bg-base-100 border border-base-300 overflow-hidden"
        >
          {loading ? (
            <QuantumLoaderFull text="Memuat arsip laporan" />
          ) : laporanList.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <FileText className="w-12 h-12 mx-auto text-base-content/30" />
              <h3 className="text-sm font-semibold text-base-content">Tidak Ada Laporan yang Ditemukan</h3>
              <p className="text-sm text-base-content/60">Belum ada catatan SO yang sesuai dengan kriteria filter.</p>
            </div>
          ) : (
            <div className="w-full overflow-visible sm:overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm mobile-card-table">
                <thead className="bg-base-200 border-b border-base-300">
                  <tr className="font-semibold text-base-content/60">
                    <th className="px-5 py-3">ID Laporan</th>
                    <th className="px-5 py-3">Tanggal dan Shift</th>
                    <th className="px-5 py-3">Waktu Dibuat</th>
                    <th className="px-5 py-3">Petugas</th>
                    <th className="px-5 py-3 text-center">Kritis</th>
                    <th className="px-5 py-3 text-center">Hampir Habis</th>
                    <th className="px-5 py-3 text-center">Status WhatsApp</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-base-content">
                  {laporanList.map((row) => (
                    <motion.tr
                      key={row.Laporan_ID}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="transition-colors border-b border-base-300 hover:bg-base-200"
                    >
                      <td className="px-5 py-3 font-mono text-xs font-medium text-base-content/60 whitespace-normal break-all" data-label="ID">
                        {row.Laporan_ID}
                      </td>
                      <td className="px-5 py-3" data-label="Tanggal">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold tabular-nums text-base-content">{row.Tanggal_Operasional}</span>
                          <span className="font-medium text-xs px-2 py-0.5 rounded-md bg-base-200 text-base-content/60 border border-base-300">
                            {row.Shift}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-base-content/70 whitespace-normal" data-label="Waktu Dibuat">
                        {formatWaktuDibuat(row.Waktu_Dibuat)}
                      </td>
                      <td className="px-5 py-3 font-medium text-base-content whitespace-normal break-words" data-label="Petugas">
                        {row.Petugas}
                      </td>
                      <td className="px-5 py-3 text-center font-bold tabular-nums" data-label="Kritis">
                        {row.Jumlah_Kritis > 0 ? (
                          <span className="badge badge-error gap-1">
                            {row.Jumlah_Kritis}
                          </span>
                        ) : (
                          <span className="text-base-content/30">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center font-bold tabular-nums" data-label="Hampir Habis">
                        {row.Jumlah_Hampir_Habis > 0 ? (
                          <span className="badge badge-warning gap-1">
                            {row.Jumlah_Hampir_Habis}
                          </span>
                        ) : (
                          <span className="text-base-content/30">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center" data-label="WhatsApp">
                        <span className={`badge ${row.Status_Kirim_WA === 'Sudah Dikirim' ? 'badge-success' : 'badge-ghost'}`}>
                          {row.Status_Kirim_WA || 'Belum'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right align-middle" data-label="Aksi">
                        <div className="grid grid-cols-3 gap-1 min-w-[168px] max-w-[180px] ml-auto">
                          <SquareAction
                            href={`/laporan/${row.Laporan_ID}`}
                            title="Lihat isi laporan langsung di aplikasi"
                            label="Lihat"
                            color="primary"
                            icon={<Eye className="w-4 h-4" />}
                          />
                          {row.Link_XLSX && (
                            <SquareAction
                              href={row.Link_XLSX}
                              target="_blank"
                              title="Unduh Berkas XLSX dari Google Drive"
                              label="XLSX"
                              color="info"
                              icon={<Table className="w-4 h-4" />}
                            />
                          )}
                          {row.Link_PDF && (
                            <SquareAction
                              href={row.Link_PDF}
                              target="_blank"
                              title="Unduh Berkas PDF"
                              label="PDF"
                              color="neutral"
                              icon={<FileDown className="w-4 h-4" />}
                            />
                          )}
                          {canEditRow(row) ? (
                            <SquareAction
                              href={`/laporan/${row.Laporan_ID}/edit`}
                              title="Edit Laporan"
                              label="Edit"
                              color="warning"
                              icon={<Pencil className="w-4 h-4" />}
                            />
                          ) : null}
                          <SquareAction
                            onClick={() => handleRegenerate(row)}
                            disabled={regeneratingId === row.Laporan_ID}
                            loading={regeneratingId === row.Laporan_ID}
                            title="Buat Ulang File"
                            label="Ulang"
                            color="ghost"
                            icon={<RefreshCw className="w-4 h-4" />}
                          />
                          <SquareAction
                            onClick={() => handleOpenWATemplate(row)}
                            title="Siapkan Pesan WhatsApp"
                            label="WA"
                            color="success"
                            icon={<Share2 className="w-4 h-4" />}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      <AnimatePresence>
        {showWATemplate && selectedLaporan && (
          <WATemplateModal
            key={selectedLaporan.Laporan_ID}
            isOpen={showWATemplate}
            onClose={() => setShowWATemplate(false)}
            cabangNama={selectedCabang.Nama_Cabang}
            tanggal={selectedLaporan.Tanggal_Operasional}
            shift={selectedLaporan.Shift}
            petugas={selectedLaporan.Petugas}
            totalItem={totalMasterItems}
            jumlahKritis={selectedLaporan.Jumlah_Kritis}
            jumlahHampirHabis={selectedLaporan.Jumlah_Hampir_Habis}
            laporanId={selectedLaporan.Laporan_ID}
            cabangId={selectedCabang.Cabang_ID}
            linkXLSX={selectedLaporan.Link_XLSX || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
