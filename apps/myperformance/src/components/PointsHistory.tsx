'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CalendarDays, RefreshCw, Target } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl, type SegmentItem } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';

export interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

type PeriodType = 'day' | 'month' | 'year';

const PERIOD_OPTIONS: SegmentItem<PeriodType>[] = [
  { value: 'day', label: 'Harian' },
  { value: 'month', label: 'Bulanan' },
  { value: 'year', label: 'Tahunan' },
];

const PROGRESS_TONE = {
  high: 'bg-success',
  mid: 'bg-warning',
  low: 'bg-error',
} as const;

function formatPeriodKey(key: string, periodType: PeriodType): string {
  if (periodType === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const date = new Date(`${key}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return key;
}

export default function PointsHistory({
  personId,
  refreshKey = 0,
}: {
  personId?: string | null;
  refreshKey?: number;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!personId) {
      setRollups([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/points/${personId}/rollup?period_type=${periodType}&limit=12`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.error || 'Gagal memuat riwayat rollup');
      }
      setRollups(json.data?.rollups ?? []);
      setTotal(Number(json.data?.total ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
      setRollups([]);
    } finally {
      setLoading(false);
    }
  }, [personId, periodType]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const monthlyTarget = Number(process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET || 1044);
  const isMonthView = periodType === 'month';
  const progress = monthlyTarget > 0 ? (total / monthlyTarget) * 100 : 0;
  const cappedProgress = Math.min(100, Math.round(progress));
  const progressTone =
    cappedProgress >= 80
      ? PROGRESS_TONE.high
      : cappedProgress >= 50
        ? PROGRESS_TONE.mid
        : PROGRESS_TONE.low;
  const activityCount = rollups.reduce((sum, rollup) => sum + Number(rollup.event_count || 0), 0);
  const unitCount = rollups.reduce((sum, rollup) => sum + Number(rollup.total_quantity || 0), 0);

  return (
    <div className="space-y-4">
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
            onClick={() => void load()}
            className="btn btn-ghost btn-xs min-h-[40px] gap-1.5"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Periode rollup
          </p>
          <SegmentedControl
            items={PERIOD_OPTIONS}
            value={periodType}
            onChange={setPeriodType}
            ariaLabel="Pilih periode riwayat rollup"
            idPrefix="points-history-period"
          />
        </div>
        {isMonthView ? (
          <div className="flex items-center gap-2 text-[11px] text-base-content/55">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Target bulanan {monthlyTarget} poin
          </div>
        ) : (
          <p className="text-[11px] text-base-content/50">
            Progres target hanya dihitung pada tampilan bulanan.
          </p>
        )}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-label="Ringkasan periode">
        <div className="card card-static p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Total periode
          </p>
          <p className="mt-2 text-xl font-semibold tabular text-base-content">
            {total.toFixed(2)}
            <span className="ml-1 text-[11px] font-medium text-base-content/50">pts</span>
          </p>
        </div>
        <div className="card card-static p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Entri rollup
          </p>
          <p className="mt-2 text-xl font-semibold tabular text-base-content">{rollups.length}</p>
        </div>
        <div className="card card-static p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Aktivitas
          </p>
          <p className="mt-2 text-xl font-semibold tabular text-base-content">{activityCount}</p>
        </div>
        <div className="card card-static p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
            Unit tercatat
          </p>
          <p className="mt-2 text-xl font-semibold tabular text-base-content">{unitCount}</p>
        </div>
      </section>

      {isMonthView ? (
        <section className="card card-static p-4 sm:p-5" aria-labelledby="history-target-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="history-target-heading" className="text-sm font-semibold text-base-content">
                Progres terhadap target bulanan
              </h2>
              <p className="mt-0.5 text-[11px] text-base-content/50">
                Total rollup bulan ini dibandingkan target {monthlyTarget} poin.
              </p>
            </div>
            <span className="text-2xl font-semibold tabular tracking-tight text-base-content">
              {cappedProgress}
              <span className="ml-0.5 text-xs font-medium text-base-content/50">%</span>
            </span>
          </div>
          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-base-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={cappedProgress}
            aria-label="Progres target rollup bulanan"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${progressTone}`}
              style={{ width: `${cappedProgress}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="card card-static overflow-hidden" aria-labelledby="history-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-200/40 px-4 py-3.5 sm:px-5">
          <div>
            <h2 id="history-list-heading" className="text-sm font-semibold text-base-content">
              Riwayat rollup poin
            </h2>
            <p className="text-[11px] text-base-content/50">
              Maksimal 12 entri terakhir untuk periode {PERIOD_OPTIONS.find((item) => item.value === periodType)?.label.toLowerCase()}.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[10px] font-semibold text-base-content/55">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            {rollups.length} entri
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4" role="status" aria-label="Memuat riwayat rollup">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
            <span className="sr-only">Memuat riwayat…</span>
          </div>
        ) : rollups.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Belum ada data rollup"
            description={`Tidak ada data rollup untuk periode ${
              PERIOD_OPTIONS.find((item) => item.value === periodType)?.label.toLowerCase()
            }. Coba pilih periode lain.`}
            compact
          />
        ) : (
          <ul className="divide-y divide-base-200">
            {rollups.map((rollup) => (
              <li
                key={`${rollup.period_key}-${rollup.period_type}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 text-xs sm:px-5"
              >
                <div className="min-w-[7rem] font-medium tabular text-base-content">
                  {formatPeriodKey(rollup.period_key, periodType)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base-content">
                    {rollup.event_count} aktivitas · {rollup.total_quantity} unit
                  </p>
                  <p className="mt-0.5 text-[11px] text-base-content/50">
                    Periode {rollup.period_type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular text-base-content">
                    {Number(rollup.total_points).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-base-content/50">poin</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
