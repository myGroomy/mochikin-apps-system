'use client';

import React, { useEffect, useState } from 'react';

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
  const progress = isMonthView && rollups.length > 0 ? (rollups[0].total_points / monthlyTarget) * 100 : (total / monthlyTarget) * 100;
  const cappedProgress = Math.min(100, Math.round(progress));

  return (
    <div className="space-y-6">
      {/* Over/Under Target Panel */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Analisis Target Poin ({periodType.toUpperCase()})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500">Akumulasi {periodType}</p>
            <p className="text-3xl font-bold text-gray-900">{total.toFixed(2)} poin</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Target Standar</p>
            <p className="text-3xl font-bold text-gray-900">{monthlyTarget} poin</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimasi Jam Efektif</p>
            <p className="text-3xl font-bold text-gray-900">~{((total * 10) / 60).toFixed(1)} jam</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">Progress Target</span>
            <span className="font-semibold text-gray-900">{cappedProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${cappedProgress}%` }} />
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
          <p className="py-4 text-center text-gray-500">Memuat riwayat...</p>
        ) : rollups.length === 0 ? (
          <p className="py-4 text-center text-gray-500">Belum ada data rollup untuk periode {periodType}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Periode Key</th>
                  <th className="py-2 pr-4">Total Aktivitas</th>
                  <th className="py-2 pr-4">Total Kuantitas</th>
                  <th className="py-2 pr-4">Total Poin</th>
                  <th className="py-2 pr-4">Terakhir Dihitung</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((r) => (
                  <tr key={r.period_key} className="border-b">
                    <td className="py-2 pr-4 font-mono font-semibold text-gray-900">{r.period_key}</td>
                    <td className="py-2 pr-4">{r.event_count} kejadian</td>
                    <td className="py-2 pr-4">{r.total_quantity} unit</td>
                    <td className="py-2 pr-4 font-bold text-gray-900">{Number(r.total_points).toFixed(2)}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{r.period_key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
