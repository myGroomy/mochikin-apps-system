'use client';

import React, { useEffect, useState } from 'react';
import {
  IconRefreshCw,
  IconClock,
  IconCalendar,
  IconTag,
  IconActivity,
} from '@/components/icons';

export interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

const PERIOD_OPTIONS: { value: 'day' | 'month' | 'year'; label: string }[] = [
  { value: 'day', label: 'Harian' },
  { value: 'month', label: 'Bulanan' },
  { value: 'year', label: 'Tahunan' },
];

export default function PointsHistory({ personId }: { personId?: string }) {
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('month');
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const pid = personId || 'me';

  useEffect(() => {
    async function fetchRollup() {
      setLoading(true);
      try {
        const res = await fetch(`/api/points/${pid}/rollup?period_type=${periodType}&limit=12`);
        const json = await res.json();
        if (json.success) {
          setRollups(json.data?.rollups ?? []);
          setTotal(Number(json.data?.total ?? 0));
        }
      } catch (e) {
        console.error('Failed to fetch rollup history:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchRollup();
  }, [pid, periodType]);

  const monthlyTarget = Number(process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET || 1044);
  const isMonthView = periodType === 'month';
  const progress = isMonthView && rollups.length > 0
    ? (rollups[0].total_points / monthlyTarget) * 100
    : (total / monthlyTarget) * 100;
  const cappedProgress = Math.min(100, Math.round(progress));

  return (
    <div className="space-y-6">
      {/* Over/Under Target Panel */}
      <div className="card p-5 reveal">
        <div className="section-head">
          <div>
            <p className="kicker">Target Poin</p>
            <h2 className="text-lg font-semibold text-base-content mt-0.5">
              Analisis target ({periodType.toUpperCase()})
            </h2>
          </div>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriodType(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors min-h-[44px] touch-target ${periodType === opt.value
                  ? 'bg-primary text-primary-content border-primary'
                  : 'bg-base-200/50 text-base-content/60 border-base-300 hover:bg-base-200 hover:text-base-content'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-base-200/40 rounded-md p-4">
            <p className="text-xs text-base-content/60">Akumulasi {periodType}</p>
            <p className="text-lg font-bold text-base-content mt-0.5">{total.toFixed(2)} poin</p>
          </div>
          <div className="card bg-base-200/40 rounded-md p-4">
            <p className="text-xs text-base-content/60">Target standar</p>
            <p className="text-lg font-bold text-base-content mt-0.5">{monthlyTarget} poin</p>
          </div>
          <div className="card bg-base-200/40 rounded-md p-4">
            <p className="text-xs text-base-content/60">Estimasi jam efektif</p>
            <p className="text-lg font-bold text-base-content mt-0.5">{((total * 10) / 60).toFixed(1)} jam</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-base-content/60">Progress target</span>
            <span className="font-semibold text-base-content">{cappedProgress}%</span>
          </div>
          <div className="w-full bg-base-200/60 rounded-md h-2.5 overflow-hidden">
            <div className="bg-primary h-full rounded-md transition-all duration-500" style={{ width: `${cappedProgress}%` }} />
          </div>
        </div>
      </div>

      {/* History Table with Period Selector */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Rollup Poin</h2>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  periodType === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
                onClick={() => setPeriodType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-4 text-center text-base-content/60">Memuat riwayat...</p>
        ) : rollups.length === 0 ? (
          <p className="py-4 text-center text-base-content/40">Belum ada data rollup untuk periode {periodType}.</p>
        ) : (
          <ul className="space-y-3">
            {rollups.map((r, i) => (
              <li key={r.period_key}>
                <div className="flex flex-wrap items-center gap-3 border-b border-base-200/40 pb-3">
                  <div className="w-20 font-mono text-sm font-semibold text-base-content">{r.period_key}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-base-content">
                      {r.event_count} aktivitas · {r.total_quantity} unit
                    </p>
                    <p className="text-xs text-base-content/50 font-mono">
                      Poin: {Number(r.total_points).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-base-content">{Number(r.total_points).toFixed(2)}</p>
                    <p className="text-xs text-base-content/50">{r.period_type}</p>
                  </div>
                </div>
                {i < rollups.length - 1 && <hr className="my-3 border-base-200/40" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
