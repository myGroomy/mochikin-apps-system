'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ChevronRight,
  CircleAlert,
  Package,
  Search,
} from 'lucide-react';
import { useCabang } from '@/lib/CabangContext';
import { toLocalISO } from '@/lib/domain/so';
import { QuantumLoaderFull } from '@/components/ui/QuantumLoader';

interface UsageItem {
  itemId: string;
  nama: string;
  area: string;
  satuan: string;
  total: number;
  rataRata: number;
  tercatat: number;
  anomali: number;
  status: string;
}

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: fractionDigits,
  }).format(value);

const cleanUnit = (unit: string) => unit.replace(/\s*[+-]\s*$/, '').trim();

const metricLabel = (item: UsageItem) => {
  const unit = cleanUnit(item.satuan);
  return `${formatNumber(Math.abs(item.total))}${unit ? ` ${unit}` : ''}`;
};

const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalISO(date);
};

export default function AnalyticsPage() {
  const { selectedCabang } = useCabang();
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [items, setItems] = useState<UsageItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSampai(toLocalISO(new Date()));
    setDari(dateDaysAgo(30));
  }, []);

  useEffect(() => {
    if (!selectedCabang || !dari || !sampai) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/dashboard/mingguan?cabang=${selectedCabang.Cabang_ID}&dari=${dari}&sampai=${sampai}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error?.message || 'Gagal memuat analytics');
        setItems(json.data?.analisisPemakaian || []);
        setError('');
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Gagal memuat analytics');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selectedCabang, dari, sampai]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      `${item.nama} ${item.itemId} ${item.area}`.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  const decreasingItems = items.filter((item) => item.total < 0);
  const increasingItems = items.filter((item) => item.total > 0);
  const anomalyCount = items.reduce((sum, item) => sum + item.anomali, 0);
  const biggestDecrease = decreasingItems[0];
  const biggestIncrease = increasingItems[0];

  if (!selectedCabang) {
    return <div className="p-8 text-center">Pilih cabang terlebih dahulu.</div>;
  }
  if (loading) return <QuantumLoaderFull text="Memuat analisis item" />;

  return (
    <main className="min-h-screen bg-base-200/40 pb-24">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Activity className="h-4 w-4" />
              Analisis operasional
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Analytics item</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-base-content/60">
              Pantau perubahan stok dan temukan item yang perlu diperiksa di {selectedCabang.Nama_Cabang}.
            </p>
          </div>
          <nav className="flex w-full rounded-xl border border-base-300 bg-base-100 p-1 text-sm shadow-sm md:w-auto" aria-label="Navigasi dashboard">
            <Link href="/dashboard/harian" className="flex-1 rounded-lg px-4 py-2 text-center text-base-content/60 transition hover:bg-base-200 md:flex-none">Dashboard</Link>
            <Link href="/dashboard/mingguan" className="flex-1 rounded-lg px-4 py-2 text-center text-base-content/60 transition hover:bg-base-200 md:flex-none">Tren</Link>
            <span className="flex-1 rounded-lg bg-primary px-4 py-2 text-center font-semibold text-primary-content md:flex-none">Analytics</span>
          </nav>
        </header>

        <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CalendarRange className="h-4 w-4 text-primary" />
                Periode analisis
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-base-content/60">
                  Mulai
                  <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="input input-bordered mt-1.5 min-h-11 w-full bg-base-100" />
                </label>
                <label className="text-xs font-medium text-base-content/60">
                  Sampai
                  <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="input input-bordered mt-1.5 min-h-11 w-full bg-base-100" />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
              {[{ label: '7 hari', days: 7 }, { label: '30 hari', days: 30 }, { label: '90 hari', days: 90 }].map((preset) => (
                <button key={preset.days} type="button" onClick={() => { setDari(dateDaysAgo(preset.days)); setSampai(toLocalISO(new Date())); }} className="btn btn-sm btn-ghost border border-base-300 bg-base-100">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error border border-error/20 text-sm">{error}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan analytics">
          {[
            { label: 'Item dianalisis', value: items.length, icon: Package, tone: 'text-primary', note: 'dengan perubahan tercatat' },
            { label: 'Catatan perubahan', value: items.reduce((sum, item) => sum + item.tercatat, 0), icon: Activity, tone: 'text-info', note: 'pengamatan dalam periode' },
            { label: 'Item berkurang', value: decreasingItems.length, icon: ArrowDownRight, tone: 'text-error', note: 'perlu dipantau' },
            { label: 'Item bertambah', value: increasingItems.length, icon: ArrowUpRight, tone: 'text-success', note: 'stok meningkat' },
          ].map((card) => (
            <article key={card.label} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <card.icon className={`mb-5 h-5 w-5 ${card.tone}`} />
              <p className="text-sm text-base-content/60">{card.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{formatNumber(card.value, 0)}</p>
              <p className="mt-2 text-xs text-base-content/50">{card.note}</p>
            </article>
          ))}
        </section>

        {anomalyCount > 0 && (
          <div className="alert border border-warning/30 bg-warning/10 text-sm text-warning-content">
            <CircleAlert className="h-5 w-5 shrink-0" />
            <span><strong>{formatNumber(anomalyCount, 0)} perubahan ekstrem</strong> tidak dimasukkan ke total utama karena jauh di luar pola pencatatan item. Periksa laporan sumbernya.</span>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-error/20 bg-error/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-error/70">Penurunan terbesar</p>
                <h2 className="mt-2 text-lg font-bold">{biggestDecrease?.nama || 'Belum ada data'}</h2>
              </div>
              <ArrowDownRight className="h-5 w-5 text-error" />
            </div>
            <p className="mt-3 text-sm text-base-content/60">
              {biggestDecrease ? `${metricLabel(biggestDecrease)} dari ${biggestDecrease.tercatat} catatan di ${biggestDecrease.area || 'area belum diisi'}.` : 'Data akan muncul setelah ada perbandingan SO.'}
            </p>
          </article>
          <article className="rounded-2xl border border-success/20 bg-success/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-success/70">Kenaikan terbesar</p>
                <h2 className="mt-2 text-lg font-bold">{biggestIncrease?.nama || 'Belum ada data'}</h2>
              </div>
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
            <p className="mt-3 text-sm text-base-content/60">
              {biggestIncrease ? `+${metricLabel(biggestIncrease)} dari ${biggestIncrease.tercatat} catatan di ${biggestIncrease.area || 'area belum diisi'}.` : 'Data akan muncul setelah ada perbandingan SO.'}
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-base-300 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Pemakaian per item</h2>
              <p className="mt-1 text-sm text-base-content/60">Nilai negatif menunjukkan stok berkurang dan digunakan.</p>
            </div>
            <label className="input input-bordered flex min-h-10 w-full items-center gap-2 bg-base-100 sm:max-w-xs">
              <Search className="h-4 w-4 text-base-content/40" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari item atau area" className="grow text-sm" aria-label="Cari item atau area" />
            </label>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <CircleAlert className="h-8 w-8 text-base-content/30" />
              <p className="mt-3 font-medium">{query ? 'Item tidak ditemukan' : 'Belum ada data pemakaian'}</p>
              <p className="mt-1 max-w-sm text-sm text-base-content/50">{query ? 'Coba gunakan kata kunci lain.' : 'Data muncul setelah laporan memiliki perbandingan SO sebelumnya.'}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-base-200 sm:hidden">
                {filteredItems.map((item) => (
                  <article key={item.itemId} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold">{item.nama}</h3>
                        <p className="mt-0.5 break-all text-[11px] text-base-content/50">{item.itemId} · {item.area || 'Area belum diisi'}</p>
                      </div>
                      <strong className={`shrink-0 text-right tabular-nums ${item.total < 0 ? 'text-error' : item.total > 0 ? 'text-success' : 'text-base-content/50'}`}>
                        {item.tercatat === 0 ? (item.anomali ? 'Perlu verifikasi' : 'Belum ada data') : `${item.total > 0 ? '+' : ''}${formatNumber(item.total)} ${cleanUnit(item.satuan)}`}
                      </strong>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-base-200/60 p-3 text-xs">
                      <div><span className="text-base-content/50">Rata-rata</span><p className="mt-1 font-medium tabular-nums">{formatNumber(item.rataRata)} {cleanUnit(item.satuan)}</p></div>
                      <div><span className="text-base-content/50">Frekuensi</span><p className="mt-1 font-medium tabular-nums">{item.tercatat} catatan</p></div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-base-200/70 text-xs text-base-content/60"><tr><th className="p-4 text-left font-semibold">Item</th><th className="p-4 text-left font-semibold">Area</th><th className="p-4 text-right font-semibold">Perubahan</th><th className="p-4 text-right font-semibold">Rata-rata</th><th className="p-4 text-right font-semibold">Frekuensi</th><th className="w-8 p-4" /></tr></thead>
                  <tbody>{filteredItems.map((item) => <tr key={item.itemId} className="border-t border-base-200 transition hover:bg-base-200/40"><td className="p-4"><div className="font-semibold">{item.nama}</div><div className="mt-0.5 text-[11px] text-base-content/50">{item.itemId}</div></td><td className="p-4 text-base-content/60">{item.area || '-'}</td><td className={`p-4 text-right font-bold tabular-nums ${item.anomali ? 'text-warning' : item.total < 0 ? 'text-error' : item.total > 0 ? 'text-success' : 'text-base-content/50'}`}>{item.tercatat === 0 ? (item.anomali ? 'Perlu verifikasi' : 'Belum ada data') : `${item.total > 0 ? '+' : ''}${formatNumber(item.total)} ${cleanUnit(item.satuan)}`}</td><td className="p-4 text-right tabular-nums">{item.tercatat === 0 ? '-' : `${formatNumber(item.rataRata)} ${cleanUnit(item.satuan)}`}</td><td className="p-4 text-right text-base-content/60 tabular-nums">{item.tercatat ? `${item.tercatat}x` : item.anomali ? `${item.anomali} anomali` : '-'}</td><td className="p-4 text-base-content/30"><ChevronRight className="h-4 w-4" /></td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
