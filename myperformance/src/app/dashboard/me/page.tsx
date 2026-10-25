import PointsDashboard from '@/components/PointsDashboard';
import PointsHistory from '@/components/PointsHistory';

export default function MyPerformancePage() {
  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Milik Saya — MyPerformance</h1>
        <p className="text-gray-600">Akumulasi poin kerja harian (T+0 Redis &amp; rollups Supabase) dan riwayat rollup.</p>
      </div>
      <PointsDashboard />
      <hr className="my-6 border-gray-200" />
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Riwayat &amp; Target (Phase M3)</h2>
        <PointsHistory />
      </div>
    </main>
  );
}
