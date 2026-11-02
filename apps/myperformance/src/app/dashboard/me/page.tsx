'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, LogIn, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import PointsDashboard from '@/components/PointsDashboard';
import PointsHistory from '@/components/PointsHistory';
import { useSession } from '@/components/session/SessionProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function MyPerformancePage() {
  const {
    status,
    authenticated,
    personId,
    name,
    branchName,
    role,
    capabilities,
    refresh,
  } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      setRefreshKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  if (status === 'loading') {
    return (
      <main className="page-shell min-h-[calc(100vh-5rem)] space-y-4">
        <CardSkeleton rows={2} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="page-shell min-h-[calc(100vh-5rem)]">
        <PageHeader
          kicker="Dashboard Saya"
          title="Poin Saya"
          description="Akumulasi poin harian dan riwayat rollup pribadi."
          badge={<RoleBadge role={role} size="md" />}
        />
        <div className="mt-6">
          <EmptyState
            icon={status === 'error' ? ShieldCheck : LogIn}
            tone="locked"
            title={status === 'error' ? 'Sesi tidak dapat dimuat' : 'Masuk lewat Launcher'}
            description={
              status === 'error'
                ? 'Server tidak dapat memverifikasi sesi saat ini. Coba muat ulang sesi, lalu buka kembali halaman ini.'
                : 'Poin pribadi hanya tersedia untuk pengguna terautentikasi. Buka MyPerformance dari Launcher agar identitas dan cabangmu terbaca.'
            }
            action={
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="btn btn-primary btn-sm min-h-[44px] gap-1.5"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {refreshing ? 'Memuat sesi…' : 'Muat ulang sesi'}
              </button>
            }
          />
        </div>
      </main>
    );
  }

  const meta = [name, branchName].filter(Boolean).join(' · ');

  return (
    <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
      <PageHeader
        kicker="Dashboard Saya"
        title="Poin Saya"
        description="Akumulasi poin kerja harian dari seluruh aplikasi dan riwayat rollup pribadi. Data ini hanya dapat dilihat olehmu."
        badge={<RoleBadge role={role} size="md" />}
        meta={meta || undefined}
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="btn btn-ghost btn-sm min-h-[44px] gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Segarkan
            </button>
            <Link
              href={capabilities.canManageScorecards ? '/scorecards/manage' : '/scorecards'}
              className="btn btn-primary btn-sm min-h-[44px] gap-1.5"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {capabilities.canManageScorecards ? 'Kelola scorecard' : 'Isi scorecard'}
            </Link>
          </>
        }
      />

      {capabilities.canViewTeamInsights ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200/30 px-4 py-3 text-xs text-base-content/65">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-info" aria-hidden="true" />
            Sebagai {capabilities.canViewScorecardDetail ? 'Admin' : 'pemimpin tim'}, kamu juga dapat
            membuka rekap performa seluruh anggota cabang.
          </span>
          <Link href="/dashboard/team" className="btn btn-ghost btn-xs min-h-[40px] gap-1.5">
            Buka rekap tim
          </Link>
        </div>
      ) : null}

      <PointsDashboard personId={personId} refreshKey={refreshKey} />

      <section className="space-y-3 border-t border-base-300 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-base-content">Riwayat &amp; target</h2>
          <p className="mt-0.5 text-[11px] text-base-content/50">
            Rollup poin disimpan per hari, bulan, dan tahun oleh layanan points.
          </p>
        </div>
        <PointsHistory personId={personId} refreshKey={refreshKey} />
      </section>
    </main>
  );
}
