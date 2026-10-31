'use client';

import React, { useEffect, useState } from 'react';
import { IconActivity, IconClock } from '@/components/icons';

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

  const statusColor = progressPercent >= 80 ? 'success' : progressPercent >= 50 ? 'warning' : 'error';

  return (
    <div className="space-y-6 page-shell">
      <div className="grid grid-cols-1 gap-5">
        {/* Card 1: Today points (wide) */}
        <div className="card p-5 reveal">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="label">Poin hari ini (T+0)</p>
              <p className="text-xs text-base-content/50">
                {todayDate ? new Date(todayDate).toLocaleDateString('id-ID') : '-'}
              </p>
            </div>
            <span className={`badge ${todaySource === 'redis' ? 'badge-outline' : ''}`}>
              {todaySource === 'redis' ? 'Redis T+0' : 'Ledger'}
            </span>
          </div>
          <p className="text-4xl font-bold text-base-content tracking-tight">
            {loading ? '—' : todayPoints.toFixed(2)}
          </p>
          <p className="text-xs text-base-content/60 mt-1">
            Sumber: {todaySource === 'redis' ? 'cache real-time (Redis)' : 'agregasi ledger'}
          </p>
        </div>

        {/* Card 2: Monthly accumulation + progress */}
        <div className="card p-5 reveal" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-base-content">Akumulasi bulan ini</h3>
            <span className="badge">/{summary?.monthTarget ?? monthlyTarget}</span>
          </div>
          <p className="text-3xl font-bold text-base-content">
            {loading ? '—' : monthTotal.toFixed(2)}
          </p>
          <div className="mt-5 w-full">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-base-content/60">Progress target</span>
              <span className="font-semibold text-base-content">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-base-200/60 rounded-md h-2.5 overflow-hidden">
              <div
                className={`h-full ${statusColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-base-content/60 mt-2">
            {summary?.pointsNeededForTarget?.toFixed(2) ?? 0} poin lagi untuk mencapai target
          </p>
        </div>

        {/* Card 3: Estimasi jam efektif */}
        <div className="card p-5 reveal" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-base-content">Estimasi jam efektif</h3>
            <span className="badge">jam</span>
          </div>
          <p className="text-3xl font-bold text-base-content">
            {loading ? '—' : (summary?.estimatedEffectiveHours ?? 0).toFixed(1)}
          </p>
          <p className="text-xs text-base-content/60 mt-2">
            Dari {summary?.effectiveHoursPerMonth ?? 173} jam efektif/bulan · {summary?.monthEventCount ?? 0} aktivitas
          </p>
        </div>

        {/* Card 4: History table card */}
        <div className="card p-5 reveal" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-base-content">Riwayat poin harian</h3>
            <span className="badge">{rollups.length} entri</span>
          </div>
          {loading ? (
            <p className="text-base-content/60">Memuat data...</p>
          ) : !showHistory ? (
            <div className="flex flex-col items-center justify-center gap-2 text-base-content/40 py-8">
              <IconActivity className="w-6 h-6" />
              <span>Belum ada data rollup historis.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-sm">
                <thead className="text-xs uppercase text-base-content/60">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Aktivitas</th>
                    <th className="py-3 px-4 text-right">Total poin</th>
                  </tr>
                </thead>
                <tbody className="text-base-content">
                  {rollups.map((r) => (
                    <tr key={`${r.period_key}-${r.event_count}`} className="hover:bg-base-200/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm">{r.period_key}</td>
                      <td className="py-3 px-4 text-sm">{r.event_count} aktivitas ({r.total_quantity} unit)</td>
                      <td className="py-3 px-4 text-right font-bold text-sm">{Number(r.total_points).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
