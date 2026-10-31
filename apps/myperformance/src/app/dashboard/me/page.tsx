import PointsDashboard from '@/components/PointsDashboard';
import PointsHistory from '@/components/PointsHistory';
import { IconBarChart3 } from '@/components/icons';

export default function MyPerformancePage() {
  return (
    <main className="page-shell min-h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Milik Saya — MyPerformance</h1>
          <p className="text-base-content/60 text-sm">
            Akumulasi poin kerja harian (T+0 Redis &amp; rollups Supabase) dan riwayat rollup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm min-h-[44px] touch-target">
            <IconBarChart3 className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
      <PointsDashboard />
      <div className="mt-8 border-t border-base-300 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-base-content">Riwayat &amp; Target (Phase M3)</h2>
        </div>
        <PointsHistory />
      </div>
    </main>
  );
}
