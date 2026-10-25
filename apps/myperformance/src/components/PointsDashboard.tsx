'use client';

import React, { useEffect, useState } from 'react';

export interface TodayPointsResponse {
  success: boolean;
  data?: { person_id: string; date: string; today_points: number; source: 'redis' | 'ledger' };
  error?: { code: string; message: string };
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
  error?: { code: string; message: string };
}

interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

export default function PointsDashboard({ personId }: { personId?: string }) {
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [todaySource, setTodaySource] = useState<'redis' | 'ledger'>('ledger');
  const [todayDate, setTodayDate] = useState<string>('');
  const [summary, setSummary] = useState<MonthlySummaryResponse['data'] | null>(null);
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const pid = personId || '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const todayRes = await fetch(`/api/points/me/today`);
        const todayJson = (await todayRes.json()) as TodayPointsResponse;
        if (todayJson.success && todayJson.data) {
          setTodayPoints(Number(todayJson.data.today_points || 0));
          setTodaySource(todayJson.data.source);
          setTodayDate(todayJson.data.date);
        }

        const summaryRes = await fetch(`/api/points/me/summary`);
        const summaryJson = (await summaryRes.json()) as MonthlySummaryResponse;
        if (summaryJson.success && summaryJson.data) {
          setSummary(summaryJson.data);
        }

        const rollupRes = await fetch(`/api/points/${pid}/rollup?period_type=day&limit=30`);
        const rollupJson = await rollupRes.json();
        if (rollupJson.success) {
          setRollups(rollupJson.data?.rollups ?? []);
        }
      } catch (e) {
        console.error('Failed to fetch points data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [pid]);

  const monthlyTarget = Number(process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET || 1044);
  const monthTotal = Number(summary?.monthTotal ?? 0);
  const progressPercent = Number(
    summary ? Math.min(100, Number(((summary.monthTotal || 0) / (summary.monthTarget || monthlyTarget)) * 100)) : 0
  );
  const showHistory = !loading && rollups.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Poin Hari Ini (T+0)</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : todayPoints.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {todaySource === 'redis' ? 'Real-time dari Redis' : 'Fallback dari ledger (Redis tidak tersedia)'}
            {todayDate ? ` · ${todayDate}` : ''}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Akumulasi Bulan Ini</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : monthTotal.toFixed(2)}{' '}
            <span className="text-lg font-normal text-gray-500">/ {summary?.monthTarget ?? monthlyTarget}</span>
          </p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progressPercent.toFixed(1)}% dari target bulanan · butuh{' '}
            {(summary?.pointsNeededForTarget ?? 0).toFixed(2)} poin lagi
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Estimasi Jam Efektif</h2>
          <p className="text-4xl font-bold text-gray-900">
            {loading ? '...' : (summary?.estimatedEffectiveHours ?? 0).toFixed(1)}{' '}
            <span className="text-lg font-normal text-gray-500">jam</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dari {summary?.effectiveHoursPerMonth ?? 173} jam efektif / bulan · {summary?.monthEventCount ?? 0} aktivitas bulan ini
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Riwayat Poin Harian (Historis Rollups)</h2>
        {loading ? (
          <p className="text-gray-500">Memuat data...</p>
        ) : !showHistory ? (
          <p className="text-gray-500">Belum ada data rollup historis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Aktivitas</th>
                  <th className="py-2 pr-4">Total Poin</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((r) => (
                  <tr key={`${r.period_key}-${r.event_count}`} className="border-b">
                    <td className="py-2 pr-4 font-mono">{r.period_key}</td>
                    <td className="py-2 pr-4">
                      {r.event_count} aktivitas ({r.total_quantity} unit)
                    </td>
                    <td className="py-2 pr-4 font-bold text-gray-900">{Number(r.total_points).toFixed(2)}</td>
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
