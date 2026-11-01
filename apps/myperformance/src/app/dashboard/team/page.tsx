'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  IconUsers,
  IconBarChart3,
  IconActivity,
  IconClock,
  IconHelpCircle,
} from '@/components/icons';
import {
  CheckCircle2,
  MessageSquare,
  Package,
  Award,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PointBadge } from '@mochikin/ui';

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

export default function TeamPerformancePage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [appBreakdown, setAppBreakdown] = useState({
    mycheck: 0,
    mycustomer: 0,
    stokis: 0,
    myperformance: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const fetchCentralPoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/points/central?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTotalPoints(data.totalPoints || 0);
          setActiveStaffCount(data.activeStaffCount || 0);
          setAppBreakdown(data.appBreakdown || { mycheck: 0, mycustomer: 0, stokis: 0, myperformance: 0 });
          setLeaderboard(data.leaderboard || []);
        }
      }
    } catch (err) {
      console.error('Gagal memuat central points:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchCentralPoints();
  }, [fetchCentralPoints]);

  return (
    <main className="page-shell min-h-[calc(100vh-5rem)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-sm badge-primary text-[10px] font-bold">
              Central Ledger
            </span>
            <span className="text-base-content/40 text-xs">•</span>
            <span className="text-xs text-base-content/60">Cross-App Points</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            Dashboard Poin Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60">
            Agregasi seluruh perolehan poin dari MyCheck (SOP), MyCustomer (CRM), Stokis (SO), dan Scorecards
          </p>
        </div>

        {/* Period Selector & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-base-200 rounded-lg p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === 'today' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === 'week' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === 'month' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === 'all' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              Semua
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCentralPoints}
            className="btn btn-ghost btn-sm btn-square"
            title="Segarkan"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Total & App Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Grand */}
        <div className="col-span-2 lg:col-span-1 card bg-primary text-primary-content p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Total Poin Semua App
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums">{totalPoints}</span>
            <span className="text-xs opacity-80 font-semibold">pts</span>
          </div>
          <span className="text-[11px] opacity-75 mt-1 block">
            {activeStaffCount} karyawan aktif
          </span>
        </div>

        {/* MyCheck */}
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-info text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>MyCheck (SOP)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content tabular-nums">{appBreakdown.mycheck}</span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
          <span className="text-[10px] text-base-content/40 mt-1 block">
            {totalPoints > 0 ? ((appBreakdown.mycheck / totalPoints) * 100).toFixed(0) : 0}% porsi
          </span>
        </div>

        {/* MyCustomer */}
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>MyCustomer (WA)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content tabular-nums">{appBreakdown.mycustomer}</span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
          <span className="text-[10px] text-base-content/40 mt-1 block">
            {totalPoints > 0 ? ((appBreakdown.mycustomer / totalPoints) * 100).toFixed(0) : 0}% porsi
          </span>
        </div>

        {/* Stokis */}
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-warning text-xs font-bold uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" />
            <span>Stokis (SO)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content tabular-nums">{appBreakdown.stokis}</span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
          <span className="text-[10px] text-base-content/40 mt-1 block">
            {totalPoints > 0 ? ((appBreakdown.stokis / totalPoints) * 100).toFixed(0) : 0}% porsi
          </span>
        </div>

        {/* MyPerformance Scorecards */}
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-secondary text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Scorecards</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-base-content tabular-nums">{appBreakdown.myperformance}</span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
          <span className="text-[10px] text-base-content/40 mt-1 block">
            {totalPoints > 0 ? ((appBreakdown.myperformance / totalPoints) * 100).toFixed(0) : 0}% porsi
          </span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card bg-base-100 border border-base-300 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
          <div>
            <h2 className="font-bold text-sm text-base-content">Peringkat &amp; Kontribusi Karyawan</h2>
            <p className="text-[11px] text-base-content/50">
              Rincian poin yang diperoleh karyawan dari masing-masing aplikasi
            </p>
          </div>
          <Link
            href="/scorecards"
            className="btn btn-outline btn-xs gap-1 text-[11px] font-semibold"
          >
            <Award className="w-3 h-3 text-secondary" />
            <span>Buka Sesi Scorecard</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="border-b border-base-200 text-base-content/50 text-[11px]">
                <th className="w-12 text-center">Rank</th>
                <th>Nama Karyawan</th>
                <th className="text-center">MyCheck</th>
                <th className="text-center">MyCustomer</th>
                <th className="text-center">Stokis</th>
                <th className="text-center">Scorecard</th>
                <th className="text-right">Total Poin</th>
                <th className="text-right">Porsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-base-content/40">
                    Memuat data peringkat poin...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-base-content/40">
                    Belum ada data transaksi poin pada periode ini
                  </td>
                </tr>
              ) : (
                leaderboard.map((u) => (
                  <tr
                    key={u.userId}
                    className={`hover:bg-base-200/40 transition-colors ${
                      u.isAnomaly ? 'bg-warning/5' : ''
                    }`}
                  >
                    <td className="text-center font-bold">
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs ${
                        u.rank === 1 ? 'bg-amber-100 text-amber-800 font-black' :
                        u.rank === 2 ? 'bg-slate-200 text-slate-800 font-bold' :
                        u.rank === 3 ? 'bg-amber-50 text-amber-700 font-bold' :
                        'text-base-content/60'
                      }`}>
                        {u.rank}
                      </span>
                    </td>
                    <td className="font-semibold text-base-content">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.isAnomaly && (
                          <span className="badge badge-warning badge-xs gap-1 text-[9px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Anomali ({u.zScore?.toFixed(1)})</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center font-mono text-base-content/70">{u.mycheck}</td>
                    <td className="text-center font-mono text-base-content/70">{u.mycustomer}</td>
                    <td className="text-center font-mono text-base-content/70">{u.stokis}</td>
                    <td className="text-center font-mono text-base-content/70">{u.myperformance}</td>
                    <td className="text-right">
                      <PointBadge points={u.total} />
                    </td>
                    <td className="text-right font-mono text-xs text-base-content/60">
                      {u.sharePercent}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
