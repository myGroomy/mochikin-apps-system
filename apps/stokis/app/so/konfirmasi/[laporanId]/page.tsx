'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useCabang } from '@/lib/CabangContext';
import {
  CheckCircle2,
  Share2,
  ExternalLink,
  ArrowLeft,
  PlusCircle,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  Table,
  Eye,
  Pencil,
} from 'lucide-react';
import { WATemplateModal } from '@/components/WATemplateModal';

export default function KonfirmasiLaporanPage() {
  const params = useParams();
  const laporanId = params?.laporanId as string;
  const { selectedCabang } = useCabang();

  const [laporan, setLaporan] = useState<any>(null);
const [loading, setLoading] = useState<boolean>(true);
const [waSent, setWaSent] = useState<boolean>(false);
const [showWATemplate, setShowWATemplate] = useState<boolean>(false);
const [errorMsg, setErrorMsg] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCabang || !laporanId) return;

    const fetchLaporan = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/laporan/${laporanId}/wa-link?cabang=${selectedCabang.Cabang_ID}`);
        const json = await res.json();
        if (json.success && json.data) {
          setLaporan(json.data.laporan);
          if (json.data.laporan?.Status_Kirim_WA === 'Sudah Dikirim') {
            setWaSent(true);
          }
        }
      } catch {
        setErrorMsg('Gagal memuat detail laporan. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    };

    fetchLaporan();
  }, [selectedCabang, laporanId]);

  const handleShareWhatsApp = () => {
    setShowWATemplate(true);
  };

  const [totalItem, setTotalItem] = useState<number>(0);


  // Fetch total item count from master items
  useEffect(() => {
    if (!selectedCabang?.Cabang_ID) return;
    const fetchTotal = async () => {
      try {
        const res = await fetch(`/api/master-item?cabang=${selectedCabang.Cabang_ID}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTotalItem(json.data.length);
        } else if (json.success && Array.isArray(json.data?.items)) {
          setTotalItem(json.data.items.length);
        }
      } catch {
        // abaikan: total item tidak kritis untuk render
      }
    };
    fetchTotal();
  }, [selectedCabang?.Cabang_ID]);

  const triggerRegenerate = async () => {
    if (!laporanId || !selectedCabang?.Cabang_ID) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(
        `/api/laporan/${laporanId}/regenerate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cabangId: selectedCabang.Cabang_ID }),
        }
      );
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      } else {
        setErrorMsg(json.error?.message ?? 'Gagal regenerate spreadsheet');
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRegenerating(false);
    }
  };
  const handleWASent = async () => {
    setWaSent(true);
    setShowWATemplate(false);
    if (!laporanId) return;
    try {
      const res = await fetch(`/api/laporan/${laporanId}/status-wa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cabangId: selectedCabang?.Cabang_ID }),
      });
      const json = await res.json();
      // abaikan hasil non-sukses: non-kritis, modal tetap ditutup
    } catch {
      // abaikan: non-kritis
    }
  };

  /**
   * Get XLSX link from database only - NO FALLBACK.
   * Returns empty string if Link_XLSX not set or not a Drive link.
   */
  const getXlsxLink = () => {
    if (laporan?.Link_XLSX && (laporan.Link_XLSX.includes('drive.google.com') || laporan.Link_XLSX.includes('drivesdk'))) {
      return laporan.Link_XLSX;
    }
    // NO FALLBACK - return empty string if not a valid Drive link
    return '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-base-content/60 text-sm tracking-wide">Memuat detail laporan...</p>
      </div>
    );
  }

  if (!loading && !laporan) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="alert alert-error text-sm" role="alert">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg || 'Gagal memuat detail laporan.'}</span>
          <button
            onClick={() => { setErrorMsg(''); setLoading(true); window.location.reload(); }}
            className="btn btn-ghost btn-xs"
          >
            Coba Lagi
          </button>
        </div>
        <div className="pt-4 text-sm">
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 text-base-content/60 hover:text-base-content font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Riwayat Laporan</span>
          </Link>
        </div>
      </div>
    );
  }

  const hasXlsxLink = getXlsxLink() !== '';
  const xlsxLink = getXlsxLink();

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Bill / Transaction Receipt Card */}
          <div className="relative bg-base-100 border border-base-300 shadow-2xl rounded-2xl overflow-hidden">
            {/* Top Receipt Header */}
            <div className="bg-base-200/50 p-6 text-center border-b border-base-300 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-success/15 text-success shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-black tracking-widest uppercase text-base-content/50">
                  {selectedCabang?.Nama_Cabang || '-'}
                </div>
                <h1 className="text-xl font-extrabold text-base-content tracking-tight uppercase">
                  Struk Stock Opname
                </h1>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Transaksi Berhasil Diisi & Tersimpan
                </p>
              </div>
            </div>

            {/* Receipt Cutout Divider Line */}
            <div className="relative flex items-center justify-between -my-3 z-10">
              <div className="-ml-3 w-6 h-6 rounded-full bg-base-200 border-r border-base-300 shadow-inner"></div>
              <div className="w-full border-t-2 border-dashed border-base-300/80"></div>
              <div className="-mr-3 w-6 h-6 rounded-full bg-base-200 border-l border-base-300 shadow-inner"></div>
            </div>

            {/* Receipt Body Details */}
            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-dashed border-base-300">
                <span className="text-base-content/60 font-semibold uppercase">No. Laporan</span>
                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-xs border border-primary/20">
                  {laporanId}
                </span>
              </div>

              {laporan && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60 uppercase">Tanggal</span>
                    <span className="font-semibold text-base-content">{laporan.Tanggal_Operasional}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60 uppercase">Shift</span>
                    <span className="font-semibold text-base-content uppercase">{laporan.Shift}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60 uppercase">Petugas</span>
                    <span className="font-semibold text-base-content">{laporan.Petugas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60 uppercase">Total Master Item</span>
                    <span className="font-semibold text-base-content">{totalItem > 0 ? `${totalItem} Item` : '—'}</span>
                  </div>

                  <div className="border-t border-dashed border-base-300 pt-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base-content/60 uppercase">Status Kritis</span>
                      <span className="font-bold text-error bg-error/10 px-2 py-0.5 rounded-lg tabular-nums">
                        {laporan.Jumlah_Kritis} Item
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base-content/60 uppercase">Status Hampir Habis</span>
                      <span className="font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-lg tabular-nums">
                        {laporan.Jumlah_Hampir_Habis} Item
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Barcode Graphic */}
              <div className="pt-4 border-t border-dashed border-base-300 flex flex-col items-center space-y-1.5 opacity-60">
                <div className="flex items-center gap-0.5 h-7">
                  <div className="w-1 h-full bg-base-content"></div>
                  <div className="w-0.5 h-full bg-base-content"></div>
                  <div className="w-2 h-full bg-base-content"></div>
                  <div className="w-1 h-full bg-base-content"></div>
                  <div className="w-0.5 h-full bg-base-content"></div>
                  <div className="w-1.5 h-full bg-base-content"></div>
                  <div className="w-0.5 h-full bg-base-content"></div>
                  <div className="w-2 h-full bg-base-content"></div>
                  <div className="w-1 h-full bg-base-content"></div>
                  <div className="w-0.5 h-full bg-base-content"></div>
                  <div className="w-1.5 h-full bg-base-content"></div>
                  <div className="w-1 h-full bg-base-content"></div>
                  <div className="w-0.5 h-full bg-base-content"></div>
                  <div className="w-2 h-full bg-base-content"></div>
                </div>
                <div className="text-xs tracking-widest uppercase text-base-content/50">
                  {selectedCabang?.Nama_Cabang
                    ? `*** LAPORAN STRUK RESMI ${selectedCabang.Nama_Cabang.toUpperCase()} ***`
                    : '*** LAPORAN STRUK RESMI ***'}
                </div>
              </div>
            </div>

            {/* Receipt Footer Actions - Grid 3x2 */}
            <div className="bg-base-200/40 p-6 border-t border-base-300 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                {/* (1,1) Lihat */}
                <Link
                  href={`/laporan/view/${laporanId}?cabang=${selectedCabang?.Cabang_ID || ''}`}
                  target="_blank"
                  className="btn btn-outline btn-primary flex flex-col items-center justify-center min-h-[52px] p-2 gap-1 text-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Lihat</span>
                </Link>

                {/* (2,1) Edit */}
                <Link
                  href={`/laporan/${laporanId}/edit?cabang=${selectedCabang?.Cabang_ID || ''}`}
                  className="btn btn-outline flex flex-col items-center justify-center min-h-[52px] p-2 gap-1 text-xs"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit</span>
                </Link>

                {/* (3,1) Spreadsheet/Excel */}
                {hasXlsxLink ? (
                  <a
                    href={xlsxLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-info flex flex-col items-center justify-center min-h-[52px] p-2 gap-1 text-xs"
                  >
                    <Table className="w-4 h-4" />
                    <span className="truncate max-w-full">Excel</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="btn btn-ghost border border-base-300 flex flex-col items-center justify-center min-h-[52px] p-2 gap-1 text-xs opacity-50 cursor-not-allowed"
                    title="File XLSX belum tersedia di Google Drive"
                  >
                    <Table className="w-4 h-4" />
                    <span className="truncate max-w-full">Excel</span>
                  </button>
                )}

                {/* (1,2) Regenerate Laporan */}
                <button
                  onClick={triggerRegenerate}
                  disabled={hasXlsxLink || isRegenerating}
                  className={`btn btn-warning flex flex-col items-center justify-center min-h-[52px] p-2 gap-1 text-xs ${
                    hasXlsxLink ? 'btn-ghost opacity-50 cursor-not-allowed border border-base-300' : ''
                  }`}
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4" />
                  )}
                  <span className="truncate max-w-full">Regenerate</span>
                </button>

                {/* (2,2 & 3,2) Share WhatsApp - Span 2 Kolom (Paling Besar) */}
                <button
                  onClick={handleShareWhatsApp}
                  className="col-span-2 btn btn-success min-h-[52px] text-sm font-bold shadow-sm gap-2"
                >
                  <Share2 className="w-5 h-5 shrink-0" />
                  <span className="truncate">{waSent ? 'Kirim Ulang WA' : 'Share WhatsApp'}</span>
                </button>
              </div>

              {/* Status XLSX Badge */}
              {hasXlsxLink && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-success font-semibold pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>File XLSX tersedia di Google Drive</span>
                </div>
              )}

              {waSent && (
                <div className="alert alert-success text-xs py-2 mt-2" role="alert">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Status laporan telah diperbarui: Sudah Dikirim</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="pt-2 flex items-center justify-between text-sm">
            <Link
              href="/laporan"
              className="inline-flex items-center gap-1.5 text-base-content/60 hover:text-base-content font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Riwayat Laporan</span>
            </Link>

            <Link
              href="/so/input"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Sesi Baru</span>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showWATemplate && laporan && (
          <WATemplateModal
            isOpen={showWATemplate}
            onClose={() => setShowWATemplate(false)}
            onSent={handleWASent}
            cabangNama={selectedCabang?.Nama_Cabang || '-'}
            tanggal={laporan.Tanggal_Operasional}
            shift={laporan.Shift}
            petugas={laporan.Petugas}
            totalItem={totalItem}
            jumlahKritis={laporan.Jumlah_Kritis}
            jumlahHampirHabis={laporan.Jumlah_Hampir_Habis}
            laporanId={laporanId}
            cabangId={selectedCabang?.Cabang_ID || ''}
            linkXLSX={xlsxLink}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
