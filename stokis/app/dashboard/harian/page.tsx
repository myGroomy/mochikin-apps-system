'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { toLocalISO } from '@/lib/domain/so';
import { CHART_THEME_FALLBACK, type ChartTheme } from '@/lib/chart-theme';
import {
  BarChart3,
  AlertCircle,
  Package,
  TrendingUp,
  ShieldAlert,
  BarChart3Icon,
  LineChartIcon,
  AreaChartIcon,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

type ChartType = 'bar' | 'line' | 'area';

interface DashboardData {
  totalTransaksi: number;
  kritis: number;
  hampirHabis: number;
  aman: number;
  detail: any[];
}

const CHART_OPTIONS: { type: ChartType; label: string; Icon: typeof BarChart3Icon }[] = [
  { type: 'bar', label: 'Batang', Icon: BarChart3Icon },
  { type: 'line', label: 'Garis', Icon: LineChartIcon },
  { type: 'area', label: 'Area', Icon: AreaChartIcon },
];

export default function DashboardHarianPage() {
  const { selectedCabang } = useCabang();

  const [tanggal, setTanggal] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState<boolean>(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [retryNonce, setRetryNonce] = useState<number>(0);
  // Tema statis (data-theme="stokis"): fallback = nilai CSS var DaisyUI yang sama persis.
  // Tanpa state/effect → bebas hydration mismatch & set-state-in-effect.
  const theme: ChartTheme = CHART_THEME_FALLBACK;

  // Fetch available dates on mount (AbortController untuk hindari race)
  useEffect(() => {
    if (!selectedCabang) return;
    const controller = new AbortController();
    setDatesLoading(true);
    fetch(`/api/dashboard/dates/${selectedCabang.Cabang_ID}`, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.dates?.length > 0) {
          setAvailableDates(json.data.dates);
          setTanggal(json.data.dates[0]); // latest date
        } else {
          const today = toLocalISO(new Date());
          setAvailableDates([]);
          setTanggal(today);
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setTanggal(toLocalISO(new Date()));
      })
      .finally(() => setDatesLoading(false));
    return () => controller.abort();
  }, [selectedCabang]);

  useEffect(() => {
    if (!selectedCabang || !tanggal) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const url = `/api/dashboard/harian?cabang=${selectedCabang.Cabang_ID}&tanggal=${tanggal}`;
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setErrorMsg(json.error?.message || 'Gagal memuat data dashboard.');
          setData(null);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setErrorMsg('Gagal memuat data dashboard. Periksa koneksi internet Anda.');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedCabang, tanggal, retryNonce]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Kritis', value: data.kritis || 0, color: theme.barColors.kritis },
      { name: 'Hampir Habis', value: data.hampirHabis || 0, color: theme.barColors.hampirHabis },
      { name: 'Aman', value: data.aman || 0, color: theme.barColors.aman },
    ];
  }, [data, theme]);

  if (!selectedCabang) {
    return (
      <div className="text-center py-16 card bg-base-100 border border-base-300 p-8 space-y-3">
        <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
        <h3 className="text-base font-bold text-base-content">Pilih Cabang Terlebih Dahulu</h3>
      </div>
    );
  }

  if (loading) {
    return <QuantumLoaderFull text="Memuat ringkasan data harian" />;
  }

  if (errorMsg && !data) {
    return (
      <div className="p-12 text-center card bg-base-100 border border-base-300 space-y-4">
        <AlertCircle className="w-10 h-10 text-error mx-auto" />
        <p className="text-base-content/60 text-sm">{errorMsg}</p>
        <button onClick={() => setRetryNonce((n) => n + 1)} className="btn btn-primary btn-sm gap-2">
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 data-onboard="dashboard-heading" className="text-xl sm:text-2xl font-semibold text-base-content flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span>Dashboard Analitik Harian</span>
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Cabang Operasional: <span className="text-base-content font-semibold">{selectedCabang.Nama_Cabang}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-base-200 rounded-lg p-1 text-sm font-medium">
            <span className="bg-base-100 text-base-content px-3 py-1 rounded-lg shadow-sm">Harian</span>
            <Link href="/dashboard/mingguan" className="text-base-content/60 hover:text-base-content px-3 py-1 rounded-lg transition-colors">
              Mingguan
            </Link>
            <Link href="/dashboard/analytics" className="text-base-content/60 hover:text-base-content px-3 py-1 rounded-lg transition-colors">
              Analytics
            </Link>
          </div>

          <select
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            disabled={datesLoading}
            aria-label="Pilih tanggal"
            className="select select-bordered px-3 py-1.5 text-sm tabular-nums"
          >
            {availableDates.length > 0 ? (
              availableDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))
            ) : (
              <option value={tanggal}>{tanggal || 'Memuat...'}</option>
            )}
          </select>

          <div className="flex bg-base-200 rounded-lg p-1" role="group" aria-label="Tipe grafik">
            {CHART_OPTIONS.map(({ type, label, Icon }) => {
              const active = chartType === type;
              return (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  aria-pressed={active}
                  title={label}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                    active
                      ? 'bg-base-100 text-primary shadow-sm'
                      : 'text-base-content/60 hover:text-base-content'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="card bg-base-100 border border-base-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-primary/10 text-primary rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-base-content/60 font-semibold">Total Item Terhitung</span>
            <h3 className="text-2xl font-bold text-base-content tabular-nums">{data?.totalTransaksi ?? 0}</h3>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="p-3 bg-error/10 text-error rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-base-content/60 font-semibold">Item Status Kritis</span>
            <h3 className="text-2xl font-bold text-error tabular-nums">{data?.kritis ?? 0}</h3>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="p-3 bg-warning/10 text-warning rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-base-content/60 font-semibold">Item Hampir Habis</span>
            <h3 className="text-2xl font-bold text-warning tabular-nums">{data?.hampirHabis ?? 0}</h3>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-success/10 text-success rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-base-content/60 font-semibold">Item Aman</span>
            <h3 className="text-2xl font-bold text-success tabular-nums">{data?.aman ?? 0}</h3>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="card bg-base-100 border border-base-300 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base-content flex items-center gap-2">
            {chartType === 'bar' ? <BarChart3Icon className="w-5 h-5 text-primary" /> : chartType === 'line' ? <LineChartIcon className="w-5 h-5 text-primary" /> : <AreaChartIcon className="w-5 h-5 text-primary" />}
            <span>Distribusi Status Item</span>
          </h3>
          <span className="text-xs font-medium text-base-content/60 bg-base-200 px-2 py-1 rounded-lg">
            {data?.totalTransaksi ?? 0} Total Transaksi
          </span>
        </div>

        <div className="md:hidden space-y-3">
          {chartData.map((entry) => {
            const total = data?.totalTransaksi || 0;
            const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={entry.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{entry.name}</span>
                  <span className="font-bold tabular-nums">{entry.value} <span className="font-normal text-base-content/50">({percent}%)</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-base-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: entry.color }} />
                </div>
              </div>
            );
          })}
          {data?.totalTransaksi === 0 && <p className="text-sm text-base-content/50">Belum ada transaksi pada tanggal ini.</p>}
        </div>
        <div className="hidden md:grid h-[320px] grid-cols-3 items-end gap-10 px-12 pb-8 pt-6">
          {chartData.map((entry) => {
            const max = Math.max(...chartData.map((item) => item.value), 1);
            const percent = data?.totalTransaksi ? Math.round((entry.value / data.totalTransaksi) * 100) : 0;
            const height = entry.value > 0 ? Math.max((entry.value / max) * 220, 12) : 4;
            return (
              <div key={entry.name} className="h-full flex flex-col items-center justify-end gap-3">
                <div className="text-sm font-bold tabular-nums">{entry.value} <span className="font-normal text-base-content/50">({percent}%)</span></div>
                <div className="w-full max-w-32 rounded-t-xl transition-all" style={{ height, backgroundColor: entry.color }} />
                <div className="text-sm font-semibold">{entry.name}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="card bg-base-100 border border-base-300 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-base-300 font-semibold text-sm text-base-content flex items-center justify-between">
          <span>Rincian Catatan SO Tanggal {tanggal}</span>
          <span className="text-base-content/60 font-mono text-xs">{data?.detail?.length || 0} Baris</span>
        </div>

        {(!data?.detail || data.detail.length === 0) ? (
          <div className="p-12 text-center text-base-content/60 text-sm space-y-2">
            <Package className="w-8 h-8 mx-auto text-base-content/30" />
            <p>Belum ada transaksi stock opname yang tercatat pada tanggal ini.</p>
            <p className="text-xs text-base-content/40">Coba ganti tanggal atau pastikan data SO sudah diinput.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm mobile-card-table">
              <caption className="sr-only">Rincian Catatan Stock Opname tanggal {tanggal}</caption>
              <thead className="bg-base-200 border-b border-base-300">
                <tr className="font-semibold text-base-content/60">
                  <th className="px-5 py-3">Nama Barang</th>
                  <th className="px-5 py-3">Shift</th>
                  <th className="px-5 py-3">Petugas</th>
                  <th className="px-5 py-3 text-center">Step 1</th>
                  <th className="px-5 py-3 text-center">Step 2</th>
                  <th className="px-5 py-3 text-center">Total</th>
                  <th className="px-5 py-3 text-center">Batas Minimum</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-base-content">
                {data.detail.map((row: any, i: number) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1 }}
                    className="border-b border-base-300 hover:bg-base-200 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold" data-label="Barang">{row.Nama_Barang}</td>
                    <td className="px-5 py-4 text-base-content/60" data-label="Shift">{row.Shift}</td>
                    <td className="px-5 py-4 text-base-content" data-label="Petugas">{row.Petugas}</td>
                    <td className="px-5 py-4 text-center tabular-nums" data-label="Step 1">{row.Step1}</td>
                    <td className="px-5 py-4 text-center tabular-nums" data-label="Step 2">{row.Step2}</td>
                    <td className="px-5 py-4 text-center font-bold text-primary tabular-nums" data-label="Total">{row.Total}</td>
                    <td className="px-5 py-4 text-center text-base-content/60 tabular-nums" data-label="Minimum">{row.Threshold}</td>
                    <td className="px-5 py-4 text-right" data-label="Status">
                      <span className={`badge ${
                        row.Status === 'Kritis'
                          ? 'badge-error'
                          : row.Status === 'Hampir Habis'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}>
                        {row.Status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}