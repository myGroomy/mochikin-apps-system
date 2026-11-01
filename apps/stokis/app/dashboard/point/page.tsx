'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { PointBadge } from '@mochikin/ui';

interface Contributor {
  userId: string;
  name: string;
  pointsEarned: number;
  isAnomaly?: boolean;
  zScore?: number;
}

interface RecentReport {
  id: string;
  source_report_id: string;
  status: string;
  total_points: number;
  created_at: string;
  metadata?: any;
}

export default function StokisPointDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [todayPoints, setTodayPoints] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingAudits, setPendingAudits] = useState(0);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/points/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTodayPoints(data.todayPoints || 0);
          setWeeklyPoints(data.weeklyPoints || 0);
          setTotalReports(data.totalReports || 0);
          setPendingAudits(data.pendingAudits || 0);
          setContributors(data.contributors || []);
          setRecentReports(data.recentReports || []);
        }
      }
    } catch (err) {
      console.error('Gagal memuat dashboard poin stokis:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-xs gap-1 text-base-content/60 hover:text-base-content"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-base-content/30">•</span>
            <span className="badge badge-sm badge-primary text-[10px] font-bold">
              Poin Stokis
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-base-content tracking-tight">
            Dashboard Poin Stock Opname
          </h1>
          <p className="text-xs text-base-content/60">
            Pemantauan bobot nilai SO, pencapaian petugas opname, dan deteksi anomali
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/master-item"
            className="btn btn-outline btn-sm gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Setup Poin Master Items</span>
          </Link>
          <button
            type="button"
            onClick={fetchDashboard}
            className="btn btn-ghost btn-sm btn-square"
            title="Segarkan"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Poin SO Hari Ini
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
              {todayPoints}
            </span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Poin SO Minggu Ini
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-base-content tabular-nums">
              {weeklyPoints}
            </span>
            <span className="text-xs text-base-content/60 font-semibold">pts</span>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Total Sesi SO Tercatat
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-base-content tabular-nums">
              {totalReports}
            </span>
            <span className="text-xs text-base-content/60 font-semibold">sesi</span>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Audit Pending
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-warning tabular-nums">
              {pendingAudits}
            </span>
            <span className="text-xs text-base-content/60 font-semibold">laporan</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Kontributor SO */}
        <div className="card bg-base-100 border border-base-300 overflow-hidden shadow-sm lg:col-span-1">
          <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
            <div>
              <h2 className="font-bold text-sm text-base-content">Peringkat Petugas SO</h2>
              <p className="text-[11px] text-base-content/50">Akumulasi 7 hari terakhir</p>
            </div>
            <span className="badge badge-sm badge-ghost text-[10px]">
              {contributors.length} Petugas
            </span>
          </div>

          <div className="p-4 space-y-2.5">
            {loading ? (
              <div className="py-8 text-center text-xs text-base-content/40">
                Memuat kontributor...
              </div>
            ) : contributors.length === 0 ? (
              <div className="py-8 text-center text-xs text-base-content/40">
                Belum ada data poin SO pada periode ini
              </div>
            ) : (
              contributors.map((c, idx) => (
                <div
                  key={c.userId}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    c.isAnomaly
                      ? 'border-warning/40 bg-warning/5'
                      : 'border-base-200 bg-base-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/60">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-base-content">
                          {c.name}
                        </span>
                        {c.isAnomaly && (
                          <span className="badge badge-warning badge-xs gap-1 text-[9px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Anomali</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-base-content/40">
                        {c.isAnomaly ? `Z-Score: ${c.zScore?.toFixed(1)}` : 'Aktivitas normal'}
                      </span>
                    </div>
                  </div>
                  <PointBadge points={c.pointsEarned} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent SO Reports */}
        <div className="card bg-base-100 border border-base-300 overflow-hidden shadow-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
            <div>
              <h2 className="font-bold text-sm text-base-content">Riwayat Laporan SO &amp; Audit</h2>
              <p className="text-[11px] text-base-content/50">Daftar laporan SO terverifikasi</p>
            </div>
            <Link href="/laporan" className="btn btn-ghost btn-xs gap-1 text-[11px] text-primary">
              <span>Lihat Semua</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-xs w-full">
              <thead>
                <tr className="border-b border-base-200 text-base-content/50">
                  <th>Sesi SO</th>
                  <th>Tanggal</th>
                  <th>Total Poin</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {recentReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-base-content/40">
                      Belum ada sesi laporan SO yang tercatat
                    </td>
                  </tr>
                ) : (
                  recentReports.map((r) => {
                    const statusBadge =
                      r.status === 'approved'
                        ? 'badge-success text-white'
                        : r.status === 'rejected'
                        ? 'badge-error text-white'
                        : 'badge-warning';

                    return (
                      <tr key={r.id} className="hover:bg-base-200/40 transition-colors">
                        <td className="font-mono text-xs font-bold text-base-content">
                          {r.source_report_id || r.id.slice(0, 8)}
                        </td>
                        <td className="text-xs text-base-content/60">
                          {new Date(r.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <PointBadge points={Number(r.total_points || 0)} size="sm" />
                        </td>
                        <td>
                          <span className={`badge badge-xs font-bold uppercase tracking-wider ${statusBadge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/laporan/${encodeURIComponent(r.source_report_id || r.id)}`}
                            className="btn btn-ghost btn-xs text-primary gap-1 font-semibold"
                          >
                            <span>Buka Laporan</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
