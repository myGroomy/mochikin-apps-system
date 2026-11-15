'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useCabang } from '@/lib/CabangContext';
import type { LaporanView } from '@/lib/domain/laporan-view';
import { LaporanReportView } from '@/components/laporan-view/LaporanReportView';

export default function LaporanViewerPage({ params }: { params: Promise<{ laporanId: string }> }) {
  const { laporanId } = use(params);
  const router = useRouter();
  const { selectedCabang } = useCabang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<LaporanView | null>(null);

  useEffect(() => {
    if (!selectedCabang?.Cabang_ID || !laporanId) return;
    setLoading(true);
    setError('');
    fetch(`/api/laporan/${encodeURIComponent(laporanId)}/view?cabang=${encodeURIComponent(selectedCabang.Cabang_ID)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setView(json.data);
        } else {
          setError(json.error?.message || 'Gagal memuat laporan');
        }
      })
      .catch(() => setError('Gagal memuat laporan'))
      .finally(() => setLoading(false));
  }, [selectedCabang?.Cabang_ID, laporanId]);

  if (!selectedCabang) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="card bg-base-100 border border-base-300 p-8 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto text-warning" />
          <h3 className="text-base font-bold">Pilih Cabang Terlebih Dahulu</h3>
          <p className="text-sm text-base-content/60">Silakan pilih cabang aktif melalui menu di navbar atas.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-10">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost btn-square btn-sm"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-base-content/50">Kembali</span>
      </div>

      {error ? (
        <div className="alert alert-error">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : view ? (
        <LaporanReportView
          view={view}
          variant="app"
          laporanId={laporanId}
          cabangId={selectedCabang.Cabang_ID}
        />
      ) : (
        <div className="card bg-base-100 border border-base-300 p-12 text-center text-base-content/50">
          Tidak ada item terisi pada laporan ini.
        </div>
      )}
    </div>
  );
}
