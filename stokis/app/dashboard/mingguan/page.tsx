'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCabang } from '@/lib/CabangContext';
import { toLocalISO } from '@/lib/domain/so';
import { CHART_THEME_FALLBACK, type ChartTheme } from '@/lib/chart-theme';
import {
  TrendingUp,
  ShieldAlert,
  Activity,
  BarChart3Icon,
  LineChartIcon,
  AreaChartIcon,
  AlertCircle,
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

type ChartType = 'bar' | 'line' | 'area';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDateShort(iso: string): string {
  if (!iso) return iso;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const month = MONTHS_SHORT[parseInt(m, 10) - 1] || m;
  return `${parseInt(d, 10)} ${month}`;
}

interface DailyStats {
  date: string;
  count: number;
  kritis: number;
  hampirHabis: number;
  aman: number;
}

const CHART_OPTIONS: { type: ChartType; label: string; Icon: typeof BarChart3Icon }[] = [
  { type: 'bar', label: 'Batang', Icon: BarChart3Icon },
  { type: 'line', label: 'Garis', Icon: LineChartIcon },
  { type: 'area', label: 'Area', Icon: AreaChartIcon },
];

export default function DashboardMingguanPage() {
  const { selectedCabang } = useCabang();

  const [dari, setDari] = useState<string>('');
  const [sampai, setSampai] = useState<string>('');
  const [datesLoading, setDatesLoading] = useState<boolean>(true);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [searchDates, setSearchDates] = useState<{ dari: string; sampai: string }>({ dari: '', sampai: '' });
  // Tema statis (data-theme="stokis"): fallback = nilai CSS var DaisyUI yang sama persis.
  // Tanpa state/effect → bebas hydration mismatch & set-state-in-effect.
  const theme: ChartTheme = CHART_THEME_FALLBACK;

  // Effect 1: fetch available dates & set default range (AbortController utk anti race)
  useEffect(() => {
    if (!selectedCabang) return;
    const controller = new AbortController();
    (async () => {
      setDatesLoading(true);
      try {
        const datesRes = await fetch(`/api/dashboard/dates/${selectedCabang.Cabang_ID}`, { signal: controller.signal });
        const datesJson = await datesRes.json();
        let dariVal = dari;
        let sampaiVal = sampai;
        if (datesJson.success && datesJson.data?.dates?.length > 0) {
          const dates: string[] = datesJson.data.dates;
          sampaiVal = dates[0];
          dariVal = dates[dates.length - 1];
        } else {
          const today = toLocalISO(new Date());
          dariVal = toLocalISO(new Date(Date.now() - 7 * 86400000));
          sampaiVal = today;
        }
        setDari(dariVal);
        setSampai(sampaiVal);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        const today = toLocalISO(new Date());
        setDari(toLocalISO(new Date(Date.now() - 7 * 86400000)));
        setSampai(today);
      } finally {
        setDatesLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCabang]);

  // Effect 2: debounce perubahan tanggal → trigger pencarian
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDates({ dari, sampai });
    }, 300);
    return () => clearTimeout(timer);
  }, [dari, sampai]);

  // Effect 3: fetch data saat rentang (debounced) berubah (AbortController anti race)
  useEffect(() => {
    if (!selectedCabang || !searchDates.dari || !searchDates.sampai) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const url = `/api/dashboard/mingguan?cabang=${selectedCabang.Cabang_ID}&dari=${searchDates.dari}&sampai=${searchDates.sampai}`;
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setData(null);
          setErrorMsg(json.error?.message || 'Gagal memuat data tren.');
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setData(null);
        setErrorMsg('Gagal memuat data tren. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedCabang, searchDates.dari, searchDates.sampai, retryNonce]);

  const trendData: DailyStats[] = useMemo(() => {
    if (!data?.trenPerHari) return [];
    return Object.entries(data.trenPerHari).map(([date, stats]: any) => ({
      date: date,
      count: stats.total || 0,
      kritis: stats.kritis || 0,
      hampirHabis: stats.hampirHabis || 0,
      aman: stats.aman || 0,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (!selectedCabang) {
    return (
      <div className="text-center py-16 card bg-base-100 border border-base-300 p-8 space-y-3">
        <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
        <h3 className="text-base font-bold text-base-content">Pilih Cabang Terlebih Dahulu</h3>
      </div>
    );
  }

  if (loading) {
    return <QuantumLoaderFull text="Memuat tren transaksi mingguan" />;
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
          <h1 data-onboard="dashboard-mingguan-heading" className="text-xl sm:text-2xl font-semibold text-base-content flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span>Dashboard Tren Mingguan</span>
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Cabang Operasional: <span className="text-base-content font-semibold">{selectedCabang.Nama_Cabang}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-base-200 rounded-lg p-1 text-sm font-medium">
            <Link href="/dashboard/harian" className="text-base-content/60 hover:text-base-content px-3 py-1 rounded-lg transition-colors">
              Harian
            </Link>
            <span className="bg-base-100 text-base-content px-3 py-1 rounded-lg shadow-sm">Mingguan</span>
            <Link href="/dashboard/analytics" className="text-base-content/60 hover:text-base-content px-3 py-1 rounded-lg transition-colors">
              Analytics
            </Link>
          </div>

          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              disabled={datesLoading}
              aria-label="Dari tanggal"
              className="input input-bordered px-3 py-1.5 text-sm tabular-nums min-h-[44px]"
            />
            <span>sampai</span>
            <input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              disabled={datesLoading}
              aria-label="Sampai tanggal"
              className="input input-bordered px-3 py-1.5 text-sm tabular-nums min-h-[44px]"
            />
          </div>

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
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Total Transaksi', value: data?.totalTransaksi ?? 0, icon: Activity, tone: 'bg-primary/10 text-primary' },
          { label: 'Item Unik', value: data?.totalItem ?? 0, icon: Package, tone: 'bg-info/10 text-info' },
          { label: 'Kritis', value: data?.kritis ?? 0, icon: AlertTriangle, tone: 'bg-error/10 text-error' },
          { label: 'Aman', value: data?.aman ?? 0, icon: CheckCircle2, tone: 'bg-success/10 text-success' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card bg-base-100 border border-base-300 p-4">
            <div className={`w-9 h-9 rounded-lg ${tone} flex items-center justify-center mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs text-base-content/60 font-semibold">{label}</span>
            <strong className="text-2xl tabular-nums">{value}</strong>
          </div>
        ))}
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
            <span>Tren Aktivitas Harian</span>
          </h3>
          <span className="text-xs font-medium text-base-content/60 bg-base-200 px-2 py-1 rounded-lg">
            {data?.totalTransaksi ?? 0} Total Transaksi
          </span>
        </div>

        <div className="h-[320px] w-full min-h-[320px] min-w-0">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-base-content/50">
              Tidak ada data aktivitas pada rentang ini.
            </div>
          ) : (
            <div className={`h-full flex items-end gap-3 sm:gap-5 px-2 sm:px-6 pb-8 pt-4 ${chartType === 'line' ? 'items-center' : ''}`}>
              {trendData.map((day) => {
                const max = Math.max(...trendData.map((item) => item.count), 1);
                const height = day.count > 0 ? Math.max((day.count / max) * 210, 12) : 4;
                const percent = data?.totalTransaksi ? Math.round((day.count / data.totalTransaksi) * 100) : 0;
                return (
                  <div key={day.date} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-2">
                    <span className="text-xs font-bold tabular-nums">{day.count} <span className="text-base-content/40 font-normal">({percent}%)</span></span>
                    <div
                      className={`w-full max-w-16 transition-all ${chartType === 'line' ? 'rounded-full h-3' : 'rounded-t-lg'}`}
                      style={chartType === 'line'
                        ? { backgroundColor: theme.series }
                        : { height, backgroundColor: chartType === 'area' ? theme.areaFill : theme.series, borderTop: chartType === 'area' ? `4px solid ${theme.series}` : undefined }}
                    />
                    <span className="text-[11px] text-base-content/60 truncate max-w-full">{formatDateShort(day.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="card bg-base-100 border border-base-300 p-5 space-y-3"
      >
        <div>
          <h3 className="font-semibold text-sm">Perubahan Stok Terbesar</h3>
          <p className="text-xs text-base-content/50">Perbandingan total awal dan akhir periode.</p>
        </div>
        {data?.perubahanTerbesar?.length ? (
          <div className="space-y-2">
            {data.perubahanTerbesar.map((item: { itemId: string; nama: string; perubahan: number; status: string }) => (
              <div key={item.itemId} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-base-200/60">
                <div className="min-w-0">
                  <div className="font-medium text-sm break-words">{item.nama}</div>
                  <div className="text-[11px] text-base-content/50">{item.itemId} · {item.status}</div>
                </div>
                <strong className={`tabular-nums shrink-0 ${item.perubahan > 0 ? 'text-success' : 'text-error'}`}>
                  {item.perubahan > 0 ? '+' : ''}{item.perubahan}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/50">Belum ada perubahan stok yang dapat dibandingkan.</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="card bg-base-100 border border-base-300 p-6 space-y-4"
      >
        <h3 className="font-semibold text-sm text-base-content uppercase tracking-wider">Distribusi Aktivitas Harian</h3>

        {trendData.length === 0 ? (
          <div className="text-center py-8 text-base-content/60 text-sm space-y-2">
            <Activity className="w-8 h-8 mx-auto text-base-content/30" />
            <p>Tidak ada aktivitas pada rentang tanggal ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {trendData.map((day) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * trendData.indexOf(day) }}
                className="p-4 bg-base-200 border border-base-300 rounded-lg text-center space-y-1"
              >
                <span className="text-xs text-base-content/60 block tabular-nums">{formatDateShort(day.date)}</span>
                <span className="text-2xl font-bold text-primary tabular-nums block">{day.count}</span>
                <div className="flex items-center justify-center gap-2 text-xs text-base-content/60 mt-1">
                  <span className="badge badge-error badge-xs">{day.kritis}K</span>
                  <span className="badge badge-warning badge-xs">{day.hampirHabis}H</span>
                  <span className="badge badge-success badge-xs">{day.aman}A</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}