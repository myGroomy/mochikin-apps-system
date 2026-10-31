import { IconUsers } from '@/components/icons';

export default function TeamPerformancePage() {
  return (
    <main className="page-shell min-h-[calc(100vh-5rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base-content">Tim — MyPerformance</h1>
        <p className="text-base-content/60 text-sm">Rekapitulasi poin dan scorecard anggota tim cabang.</p>
      </div>
      <div className="card border-base-300 p-6">
        <div className="flex items-center gap-3 text-base-content/60">
          <IconUsers className="w-5 h-5" />
          <p>Belum ada data tim untuk ditampilkan.</p>
        </div>
      </div>
    </main>
  );
}
