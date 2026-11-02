'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Clock, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export interface TodayPointsResponse {
  success: boolean;
  data?: { person_id: string; date: string; today_points: number; source: 'redis' | 'ledger' };
  error?: { code: string; message: string } | string;
}

export interface MonthlySummaryResponse {
  success: boolean;
  data?: {
    personId: string;
    branchId: string;
    month: string;
    monthTotalPoints: number;
    monthEventCount: number;
    monthTotal: number;
    monthTarget: number;
    progressPercent: number;
    effectiveHoursPerMonth: number;
    estimatedEffectiveHours: number;
    pointsNeededForTarget: number;
    todayPoints: number;
    todaySource: 'redis' | 'ledger' | 'none';
  };
  error?: { code: string; message: string } | string;
}

interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

const PROGRESS_TONE = {
  high: 'bg-success',
  mid: 'bg-warning',
  low: 'bg-error',
} as const;

function formatPeriodKey(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PointsDashboard({
  personId,
  refreshKey = 0,
}: {
  personId?: string | null;
  refreshKey?: number;
}) {
  const [todayPoints, setTodayPoints] = useState(0);
  const [todaySource, setTodaySource] = useState<'redis' | 'ledger'>('ledger');
  const [todayDate, setTodayDate] = useState('');
  const [summary, setSummary] = useState<MonthlySummaryResponse['data'] | null>(null);
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [todayRes, summaryRes, rollupRes] = await Promise.all([
        fetch('/api/points/me/today', { cache: 'no-store' }),
        fetch('/api/points/me/summary', { cache: 'no-store' }),
        personId
          ? fetch(`/api/points/${personId}/rollup?period_type=day&limit=30`, {
              cache: 'no-store',
            })
          : Promise.resolve(null),
      ]);

      const todayJson = (await todayRes.json()) as TodayPointsResponse;
      if (!todayRes.ok || !todayJson.success || !todayJson.data) {
        throw new Error(
          typeof todayJson.error === 'string'
            ? todayJson.error
            : todayJson.error?.message || 'Gagal memuat poin hari ini'
        );
      }
      setTodayPoints(Number(todayJson.data.today_points || 0));
      setTodaySource(todayJson.data.source);
      setTodayDate(todayJson.data.date);

      const summaryJson = (await summaryRes.json()) as MonthlySummaryResponse;
      if (!summaryRes.ok || !summaryJson.success || !summaryJson.data) {
        throw new Error(
          typeof summaryJson.error === 'string'
            ? summaryJson.error
            : summaryJson.error?.message || 'Gagal memuat ringkasan bulanan'
        );
      }
      setSummary(summaryJson.data);

      if (rollupRes) {
        const rollupJson = await rollupRes.json();
        setRollups(rollupJson.success ? rollupJson.data?.rollups ?? [] : []);
      } else {
        setRollups([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const monthlyTarget = Number(process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET || 1044);
  const monthTotal = Number(summary?.monthTotal ?? 0);
  const progressPercent =
    summary && Number(summary.monthTarget || monthlyTarget) > 0
      ? Math.min(100, (monthTotal / Number(summary.monthTarget || monthlyTarget)) * 100)
      : 0;
  const progressTone =
    progressPercent >= 80
      ? PROGRESS_TONE.high
      : progressPercent >= 50
        ? PROGRESS_TONE.mid
        : PROGRESS_TONE.low;

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
        <div className="card card-static space-y-3 p-5" role="status" aria-label="Memuat progres">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-3 w-48" />
          <span className="sr-only">Memuat data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/[0.05] px-4 py-3 text-xs text-base-content/75"
        >
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-error" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="btn btn-ghost btn-xs min-h-[40px] gap-1.5"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      <section aria-label="Ringkasan poin pribadi" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Poin hari ini"
          value={todayPoints.toFixed(2)}
          unit="pts"
          icon={Zap}
          tone="primary"
          hint={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-base-300 bg-base-100 px-1.5 py-0.5 text-[10px] font-semibold text-base-content/60">
                {todaySource === 'redis' ? 'Redis T+0' : 'Ledger'}
              </span>
              <span>
                {todayDate
                  ? new Date(`${todayDate}T00:00:00`).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Tanggal belum tersedia'}
              </span>
            </span>
          }
        />
        <StatCard
          label="Akumulasi bulan ini"
          value={monthTotal.toFixed(2)}
          unit="pts"
          icon={TrendingUp}
          tone="info"
          hint={`${progressPercent.toFixed(1)}% dari target ${Number(
            summary?.monthTarget ?? monthlyTarget
          )} poin.`}
        />
        <StatCard
          label="Estimasi jam efektif"
          value={(summary?.estimatedEffectiveHours ?? 0).toFixed(1)}
          unit="jam"
          icon={Clock}
          tone="neutral"
          hint={`${summary?.monthEventCount ?? 0} aktivitas dari ${
            summary?.effectiveHoursPerMonth ?? 173
          } jam efektif/bulan.`}
        />
      </section>

      <section className="card card-static p-4 sm:p-5" aria-labelledby="monthly-progress-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="monthly-progress-heading" className="text-sm font-semibold text-base-content">
              Progres target bulanan
            </h2>
            <p className="mt-0.5 text-[11px] text-base-content/50">
              {summary?.pointsNeededForTarget
                ? `${Number(summary.pointsNeededForTarget).toFixed(2)} poin lagi untuk mencapai target.`
                : 'Target bulan ini sudah tercapai.'}
            </p>
          </div>
          <span className="text-2xl font-semibold tabular tracking-tight text-base-content">
            {progressPercent.toFixed(1)}
            <span className="ml-0.5 text-xs font-medium text-base-content/50">%</span>
          </span>
        </div>
        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-base-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label="Progres target poin bulanan"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${progressTone}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-base-content/50">
          <span>
            {monthTotal.toFixed(2)} / {Number(summary?.monthTarget ?? monthlyTarget)} poin
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            {summary?.month ?? 'Bulan berjalan'}
          </span>
        </div>
      </section>

      <section className="card card-static overflow-hidden" aria-labelledby="daily-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-200/40 px-4 py-3.5 sm:px-5">
          <div>
            <h2 id="daily-history-heading" className="text-sm font-semibold text-base-content">
              Riwayat poin harian
            </h2>
            <p className="text-[11px] text-base-content/50">
              30 rollup harian terakhir dari ledger poin.
            </p>
          </div>
          <span className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[10px] font-semibold text-base-content/55">
            {rollups.length} entri
          </span>
        </div>

        {rollups.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Belum ada data rollup"
            description="Rollup harian akan muncul setelah ada aktivitas poin yang tercatat di ledger."
            compact
          />
        ) : (
          <>
            <div className="divide-y divide-base-200 sm:hidden">
              {rollups.map((rollup) => (
                <div
                  key={`${rollup.period_key}-${rollup.event_count}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-base-content">{formatPeriodKey(rollup.period_key)}</p>
                    <p className="mt-0.5 text-[11px] text-base-content/50">
                      {rollup.event_count} aktivitas · {rollup.total_quantity} unit
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular text-base-content">
                    {Number(rollup.total_points).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="border-b border-base-200 text-[11px] text-base-content/50">
                    <th>Tanggal</th>
                    <th>Aktivitas</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Total poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 text-xs">
                  {rollups.map((rollup) => (
                    <tr
                      key={`${rollup.period_key}-${rollup.event_count}`}
                      className="transition-colors hover:bg-base-200/40"
                    >
                      <td className="font-medium text-base-content">
                        {formatPeriodKey(rollup.period_key)}
                      </td>
                      <td className="text-base-content/60">{rollup.event_count} aktivitas</td>
                      <td className="text-right tabular text-base-content/60">
                        {rollup.total_quantity}
                      </td>
                      <td className="text-right font-semibold tabular text-base-content">
                        {Number(rollup.total_points).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
