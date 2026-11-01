'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  GearSix,
  Sparkle,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Calendar,
  WhatsappLogo,
  ShieldCheck,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PointBadge } from '@mochikin/ui';
import { toast } from 'sonner';
import { fadeUp } from '@/lib/motion';
import { useMounted } from '@/lib/useMounted';

interface Contributor {
  userId: string;
  name: string;
  pointsEarned: number;
  sharePercent: number;
  isAnomaly?: boolean;
  zScore?: number;
}

interface PointLog {
  id: string;
  userId: string;
  userName: string;
  activityType: string;
  pointsEarned: number;
  pointsOriginal: number;
  isZeroed: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function MyCustomerAdminPointsPage() {
  const ready = useMounted();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [auditingId, setAuditingId] = useState<string | null>(null);

  // Config State
  const [pointsPerWa, setPointsPerWa] = useState(1.0);
  const [repeatCust, setRepeatCust] = useState(true);
  const [repeatWa, setRepeatWa] = useState(true);

  // Report State
  const [totalFollowUps, setTotalFollowUps] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [logs, setLogs] = useState<PointLog[]>([]);

  // 1. Load Point Config
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/point-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setPointsPerWa(Number(data.config.points_per_wa ?? 1.0));
          setRepeatCust(data.config.repeat_customer_point ?? true);
          setRepeatWa(data.config.repeat_wa_point ?? true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Load Daily Report
  const loadReport = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/points/report?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTotalFollowUps(data.totalFollowUps || 0);
          setTotalPoints(data.totalPoints || 0);
          setContributors(data.contributors || []);
          setLogs(data.logs || []);
        }
      }
    } catch (err) {
      toast.error('Gagal memuat laporan poin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  // 3. Save Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/point-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points_per_wa: pointsPerWa,
          repeat_customer_point: repeatCust,
          repeat_wa_point: repeatWa,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Pengaturan poin berhasil disimpan');
      } else {
        toast.error(data.error || 'Gagal menyimpan konfigurasi');
      }
    } catch (err) {
      toast.error('Kesalahan koneksi');
    } finally {
      setSavingConfig(false);
    }
  };

  // 4. Audit Log (Zero / Undo Zero)
  const handleAudit = async (logId: string, action: 'zero_point' | 'undo_zero_point') => {
    setAuditingId(logId);
    try {
      const res = await fetch('/api/admin/points/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: logId,
          action,
          note: action === 'zero_point' ? 'Dinulkan admin dari dashboard' : 'Dipulihkan admin dari dashboard',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        loadReport(selectedDate);
      } else {
        toast.error(data.error || 'Gagal melakukan audit');
      }
    } catch {
      toast.error('Kesalahan server saat memproses audit');
    } finally {
      setAuditingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-10 pb-28 md:pb-20">
      {/* Back button & Heading */}
      <motion.div
        variants={fadeUp}
        custom={0}
        initial="hidden"
        animate={ready ? 'show' : 'hidden'}
        className="mb-8"
      >
        <Link
          href="/app/admin"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-ash hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={14} weight="bold" className="transition-transform group-hover:-translate-x-0.5" />
          <span>Kembali ke Panel Admin</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#022D4E]">
              Sistem Poin CRM
            </Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Pengaturan &amp; Laporan Poin Follow-up
            </h1>
            <p className="mt-1 text-xs text-ash sm:text-sm">
              Atur reward chat WhatsApp, pantau perolehan poin petugas harian, dan audit transaksi
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadReport(selectedDate)}
            className="flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-sunken active:scale-95 transition-all"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span>Segarkan</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pengaturan Poin CRM */}
        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate={ready ? 'show' : 'hidden'}
          className="lg:col-span-1 space-y-6"
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4 border-b border-hairline pb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#022D4E]-wash text-[#022D4E]">
                  <GearSix size={18} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Konfigurasi Poin</h2>
                  <p className="text-[11px] text-ash">Aturan reward follow-up</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ash mb-1.5">
                    Poin per Chat WA
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerWa}
                    onChange={(e) => setPointsPerWa(Number(e.target.value))}
                    className="h-10 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-ash">
                    Jumlah poin yang didapatkan petugas saat menekan Chat WA.
                  </p>
                </div>

                <div className="rounded-xl border border-hairline p-3.5 bg-sunken/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink">Repeat Customer</span>
                      <p className="text-[10px] text-ash">Beri poin untuk pelanggan lama</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={repeatCust}
                      onChange={(e) => setRepeatCust(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#022D4E]"
                    />
                  </div>

                  <div className="border-t border-hairline pt-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink">Repeat WA (Beda Hari)</span>
                      <p className="text-[10px] text-ash">Beri poin jika di-chat lagi hari lain</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={repeatWa}
                      onChange={(e) => setRepeatWa(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#022D4E]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-3 text-[11px] text-[#022D4E] flex items-start gap-2">
                  <ShieldCheck size={16} weight="fill" className="text-emerald shrink-0 mt-0.5" />
                  <span>
                    <strong>Anti-Spam Aktif:</strong> Poin dikunci 1x per customer per hari secara otomatis.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#022D4E] py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 active:scale-98 transition-all disabled:opacity-50"
                >
                  <Sparkle size={14} weight="fill" />
                  <span>{savingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Laporan Harian & Audit Poin */}
        <motion.div
          variants={fadeUp}
          custom={2}
          initial="hidden"
          animate={ready ? 'show' : 'hidden'}
          className="lg:col-span-2 space-y-6"
        >
          {/* Date Selector & Metrics */}
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} weight="duotone" className="text-[#022D4E]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Laporan Tanggal
                  </span>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 w-auto text-xs"
                />
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-hairline p-3 bg-sunken/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">
                    Total Follow-up WA
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-ink">{totalFollowUps}</span>
                    <span className="text-xs text-ash">chat</span>
                  </div>
                </div>

                <div className="rounded-xl border border-hairline p-3 bg-sunken/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">
                    Total Poin Diberikan
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#022D4E]">{totalPoints}</span>
                    <span className="text-xs text-ash">pts</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl border border-hairline p-3 bg-sunken/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">
                    Petugas Aktif
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-ink">{contributors.length}</span>
                    <span className="text-xs text-ash">orang</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contributors Leaderboard & Anomaly */}
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Kontributor Follow-up</h2>
                  <p className="text-[11px] text-ash">Perolehan poin per petugas hari ini</p>
                </div>
                <Badge className="bg-white border-hairline text-ink text-[10px]">
                  {contributors.length} Petugas
                </Badge>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-ash">Memuat data kontributor...</div>
              ) : contributors.length === 0 ? (
                <div className="py-8 text-center text-xs text-ash">
                  Belum ada aktivitas follow-up pada tanggal ini
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contributors.map((c, i) => (
                    <div
                      key={c.userId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        c.isAnomaly
                          ? 'border-amber/40 bg-amber/5'
                          : 'border-hairline bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ash">
                          {i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink">{c.name}</span>
                            {c.isAnomaly && (
                              <Badge className="border-amber/30 bg-amber/15 text-[#022D4E] text-[10px] flex items-center gap-1">
                                <Warning size={12} weight="fill" className="text-amber" />
                                <span>Anomali (Z: {c.zScore?.toFixed(1)})</span>
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-ash">
                            Porsi: {c.sharePercent.toFixed(1)}% dari total harian
                          </span>
                        </div>
                      </div>

                      <PointBadge points={c.pointsEarned} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Granular Logs & Reversible Audit */}
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 border-b border-hairline pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Audit Transaksi Poin</h2>
                  <p className="text-[11px] text-ash">
                    Koreksi poin dapat dinulkan atau dipulihkan sewaktu-waktu
                  </p>
                </div>
                <Badge className="bg-white border-hairline text-ink text-[10px]">
                  {logs.length} Log
                </Badge>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-ash">Memuat log transaksi...</div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-ash">
                  Tidak ada catatan transaksi poin pada tanggal ini
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-hairline text-[10px] font-semibold uppercase tracking-wider text-ash">
                        <th className="pb-2.5">Waktu</th>
                        <th className="pb-2.5">Petugas</th>
                        <th className="pb-2.5">Aktivitas</th>
                        <th className="pb-2.5">Poin</th>
                        <th className="pb-2.5 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {logs.map((log) => {
                        const isAuditing = auditingId === log.id;
                        const time = new Date(log.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={log.id} className="hover:bg-sunken/30 transition-colors">
                            <td className="py-2.5 font-mono text-[11px] text-ash">{time}</td>
                            <td className="py-2.5 font-medium text-ink">{log.userName}</td>
                            <td className="py-2.5">
                              <span className="inline-flex items-center gap-1 rounded bg-sunken px-2 py-0.5 text-[10px] text-ink-soft">
                                <WhatsappLogo size={12} weight="fill" className="text-emerald" />
                                {log.activityType}
                              </span>
                            </td>
                            <td className="py-2.5">
                              {log.isZeroed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose line-through">
                                  {log.pointsOriginal} pt
                                  <Badge className="border-rose/25 bg-rose/10 text-rose text-[9px] py-0 px-1">
                                    0 pt
                                  </Badge>
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald">
                                  +{log.pointsEarned} pt
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right">
                              {log.isZeroed ? (
                                <button
                                  type="button"
                                  onClick={() => handleAudit(log.id, 'undo_zero_point')}
                                  disabled={isAuditing}
                                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald hover:bg-emerald/10 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <ArrowCounterClockwise size={12} weight="bold" />
                                  <span>{isAuditing ? '...' : 'Pulihkan'}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAudit(log.id, 'zero_point')}
                                  disabled={isAuditing}
                                  className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] font-semibold text-rose hover:bg-rose/10 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <span>{isAuditing ? '...' : 'Nulkan (0 pt)'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
