import { notFound } from 'next/navigation';
import { buildLaporanView } from '@/lib/domain/laporan-view';
import { LaporanReportView } from '@/components/laporan-view/LaporanReportView';
import './view.css';

export const dynamic = 'force-dynamic';

export default async function LaporanViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ laporanId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { laporanId } = await params;
  const sp = await searchParams;
  const cabangId = typeof sp.cabang === 'string' ? sp.cabang : '';

  if (!laporanId || !cabangId) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20">
        <div className="card bg-base-100 border border-base-300 p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Parameter Tidak Lengkap</h2>
          <p className="text-sm text-base-content/60">
            URL harus berisi parameter <code className="font-mono bg-base-200 px-1.5 py-0.5 rounded text-xs">cabang</code>.
          </p>
        </div>
      </div>
    );
  }

  let view: Awaited<ReturnType<typeof buildLaporanView>>;
  try {
    view = await buildLaporanView(cabangId, laporanId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
    if (msg.includes('tidak ditemukan') || msg.includes('TIDAK_DITEMUKAN') || msg.includes('TIDAK_AKTIF')) notFound();
    return (
      <div className="max-w-xl mx-auto px-6 py-20">
        <div className="alert alert-error">
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-10">
      <LaporanReportView
        view={view}
        variant="public"
        laporanId={laporanId}
        cabangId={cabangId}
      />
    </div>
  );
}
