'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  LogIn,
  MessageSquare,
  Package,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PointBadge } from '@mochikin/ui';
import { useSession } from '@/components/session/SessionProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';

interface LeaderboardUser {
  userId: string;
  name: string;
  total: number;
  mycheck: number;
  mycustomer: number;
  stokis: number;
  myperformance: number;
  rank: number;
  sharePercent: number;
  isAnomaly?: boolean;
  zScore?: number;
}

type Period = 'today' | 'week' | 'month' | 'all';

const PERIODS: SegmentItem<Period>[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: '7 Hari' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'all', label: 'Semua' },
];

const EMPTY_BREAKDOWN = {
  mycheck: 0,
  mycustomer: 0,
  stokis: 0,
  myperformance: 0,
};

export default function TeamPerformancePage() {
  const {
    status: sessionStatus,
    authenticated,
    personId,
    branchName,
    role,
    capabilities,
  } = useSession();

  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [appBreakdown, setAppBreakdown] = useState(EMPTY_BREAKDOWN);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const fetchCentralPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/points/central?period=${period}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(apiErrorMessage(data, 'Gagal memuat data poin'));
      }

      setTotalPoints(data.totalPoints || 0);
      setActiveStaffCount(data.activeStaffCount || 0);
      setAppBreakdown(data.appBreakdown || EMPTY_BREAKDOWN);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (sessionStatus !== 'ready' || !authenticated || !capabilities.canViewTeamInsights) {
      setLoading(false);
      return;
    }
    void fetchCentralPoints();
  }, [
    fetchCentralPoints,
    sessionStatus,
    authenticated,
    capabilities.canViewTeamInsights,
  ]);

  const showAnomaly = capabilities.isAdmin;
  const canSeeTeam = capabilities.canViewTeamInsights;

  if (sessionStatus === 'loading') {
    return (
      <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
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
          kicker="Dashboard Tim"
          title="Performa Tim"
          description="Rekap poin lintas aplikasi untuk seluruh anggota cabang."
          badge={<RoleBadge role={role} size="md" />}
        />
        <div className="mt-6">
          <EmptyState
            icon={LogIn}
            tone="locked"
            title="Masuk lewat Launcher"
            description="Rekap tim hanya tersedia untuk pengguna terautentikasi. Buka MyPerformance dari Launcher agar peran dan cabangmu terbaca."
          />
        </div>
      </main>
    );
  }

  if (!canSeeTeam) {
    return (
      <main className="page-shell min-h-[calc(100vh-5rem)]">
        <PageHeader
          kicker="Dashboard Tim"
          title="Performa Tim"
          description="Halaman ini menampilkan peringkat seluruh anggota cabang."
          badge={<RoleBadge role={role} size="md" />}
          meta={branchName ?? undefined}
        />
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            tone="locked"
            title="Rekap tim khusus Kapten ke atas"
            description="Sesuai kebijakan privasi, Petugas hanya dapat melihat total skor pribadi. Hubungi Kapten atau Admin jika kamu membutuhkan rekap tim."
            action={
              <Link href="/dashboard/me" className="btn btn-primary btn-sm min-h-[44px] gap-1.5">
                <Users className="h-4 w-4" aria-hidden="true" />
                Buka skor saya
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
      <PageHeader
        kicker="Dashboard Tim"
        title="Performa Tim"
        description="Agregasi poin dari MyCheck (SOP), MyCustomer (CRM), Stokis (SO), dan Scorecards. Hanya Kapten ke atas yang dapat melihat peringkat tim."
        badge={<RoleBadge role={role} size="md" />}
        meta={branchName ?? undefined}
        actions={
          <>
            <button
              type="button"
              onClick={() => void fetchCentralPoints()}
              disabled={loading}
              className="btn btn-ghost btn-sm min-h-[44px] gap-1.5"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Segarkan
            </button>
            <Link
              href={capabilities.canManageScorecards ? '/scorecards/manage' : '/scorecards'}
              className="btn btn-primary btn-sm min-h-[44px] gap-1.5"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              {capabilities.canManageScorecards ? 'Kelola scorecard' : 'Buka scorecard'}
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Periode data
          </p>
          <SegmentedControl
            items={PERIODS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Pilih periode data"
            idPrefix="team-period"
          />
        </div>
        {!showAnomaly ? (
          <p className="max-w-sm text-[11px] leading-relaxed text-base-content/50">
            Penanda anomali hanya ditampilkan untuk Admin. Kapten dan Manajer melihat rekap tanpa
            flag audit.
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/[0.05] px-4 py-3 text-xs text-base-content/75"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-error" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void fetchCentralPoints()}
            className="btn btn-ghost btn-xs min-h-[40px] gap-1.5"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      <section aria-label="Ringkasan poin" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total semua app"
          value={totalPoints}
          unit="pts"
          icon={Award}
          tone="primary"
          hint={`${activeStaffCount} karyawan aktif pada periode ini.`}
        />
        <StatCard
          label="MyCheck (SOP)"
          value={appBreakdown.mycheck}
          unit="pts"
          icon={CheckCircle2}
          tone="info"
          hint={`${percentage(appBreakdown.mycheck, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="MyCustomer (WA)"
          value={appBreakdown.mycustomer}
          unit="pts"
          icon={MessageSquare}
          tone="success"
          hint={`${percentage(appBreakdown.mycustomer, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="Stokis (SO)"
          value={appBreakdown.stokis}
          unit="pts"
          icon={Package}
          tone="warning"
          hint={`${percentage(appBreakdown.stokis, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="Scorecards"
          value={appBreakdown.myperformance}
          unit="pts"
          icon={Award}
          tone="neutral"
          hint={`${percentage(appBreakdown.myperformance, totalPoints)}% dari total poin.`}
        />
      </section>

      <section className="card card-static overflow-hidden" aria-labelledby="leaderboard-heading">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-300 bg-base-200/40 px-4 py-3.5 sm:px-5">
          <div>
            <h2 id="leaderboard-heading" className="text-sm font-semibold text-base-content">
              Peringkat &amp; kontribusi karyawan
            </h2>
            <p className="text-[11px] text-base-content/50">
              Rincian poin per aplikasi untuk periode terpilih.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[10px] font-semibold text-base-content/55">
            <Users className="h-3 w-3" aria-hidden="true" />
            {leaderboard.length} karyawan
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : leaderboard.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Belum ada transaksi poin"
            description="Tidak ada perolehan poin pada periode ini. Coba pilih periode lain atau segarkan data."
            action={
              <button
                type="button"
                onClick={() => void fetchCentralPoints()}
                className="btn btn-ghost btn-sm min-h-[44px] gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Segarkan
              </button>
            }
          />
        ) : (
          <>
            <div className="divide-y divide-base-200 md:hidden">
              {leaderboard.map((user) => {
                const isSelf = user.userId === personId;
                const anomaly = showAnomaly && user.isAnomaly;
                return (
                  <div key={user.userId} className={`space-y-3 p-4 ${isSelf ? 'bg-primary/[0.03]' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <RankMark rank={user.rank} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-base-content">
                            <span className="truncate">{user.name}</span>
                            {isSelf ? (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                Anda
                              </span>
                            ) : null}
                            {anomaly ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                                Anomali
                                {typeof user.zScore === 'number' ? ` (${user.zScore.toFixed(1)})` : ''}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[11px] text-base-content/50">
                            Porsi kontribusi {user.sharePercent}%
                          </p>
                        </div>
                      </div>
                      <PointBadge points={user.total} />
                    </div>

                    <dl className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <MobileRow label="MyCheck" value={user.mycheck} />
                      <MobileRow label="MyCustomer" value={user.mycustomer} />
                      <MobileRow label="Stokis" value={user.stokis} />
                      <MobileRow label="Scorecard" value={user.myperformance} />
                    </dl>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="border-b border-base-200 text-[11px] text-base-content/50">
                    <th className="w-14 text-center">Rank</th>
                    <th>Nama karyawan</th>
                    <th className="text-center">MyCheck</th>
                    <th className="text-center">MyCustomer</th>
                    <th className="text-center">Stokis</th>
                    <th className="text-center">Scorecard</th>
                    <th className="text-right">Total poin</th>
                    <th className="text-right">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 text-xs">
                  {leaderboard.map((user) => {
                    const isSelf = user.userId === personId;
                    const anomaly = showAnomaly && user.isAnomaly;
                    return (
                      <tr
                        key={user.userId}
                        className={`transition-colors hover:bg-base-200/40 ${
                          isSelf ? 'bg-primary/[0.03]' : anomaly ? 'bg-warning/[0.05]' : ''
                        }`}
                      >
                        <td className="text-center">
                          <RankMark rank={user.rank} />
                        </td>
                        <td className="font-semibold text-base-content">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf ? (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                Anda
                              </span>
                            ) : null}
                            {anomaly ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                                Anomali
                                {typeof user.zScore === 'number' ? ` (${user.zScore.toFixed(1)})` : ''}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-center tabular text-base-content/65">{user.mycheck}</td>
                        <td className="text-center tabular text-base-content/65">{user.mycustomer}</td>
                        <td className="text-center tabular text-base-content/65">{user.stokis}</td>
                        <td className="text-center tabular text-base-content/65">{user.myperformance}</td>
                        <td className="text-right">
                          <PointBadge points={user.total} />
                        </td>
                        <td className="text-right tabular text-[11px] text-base-content/55">
                          {user.sharePercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function percentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function apiErrorMessage(payload: { error?: unknown }, fallback: string): string {
  const error = payload?.error;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function RankMark({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'bg-warning/15 text-warning'
      : rank === 2
        ? 'bg-base-300/70 text-base-content/70'
        : rank === 3
          ? 'bg-warning/10 text-warning/80'
          : 'text-base-content/45';

  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular ${tone}`}
      aria-label={`Peringkat ${rank}`}
    >
      {rank}
    </span>
  );
}

function MobileRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-base-200/50 px-2 py-1">
      <dt className="text-base-content/50">{label}</dt>
      <dd className="font-semibold tabular text-base-content/75">{value}</dd>
    </div>
  );
}
