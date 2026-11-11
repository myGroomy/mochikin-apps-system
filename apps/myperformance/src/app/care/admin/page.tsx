"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  LockOpen,
  Plus,
  ArrowRight,
  Sparkle,
  CheckCircle,
  Warning,
  ChatsCircle,
  Funnel,
  Table,
} from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatScore } from "@/lib/care/scoring";

export default function CareAdminPage() {
  const router = useRouter();
  const { role } = useSession();

  const [activeTab, setActiveTab] = useState<"monitoring" | "heatmap" | "keluhan">("monitoring");
  const [loading, setLoading] = useState(true);

  // Monitoring state
  const [period, setPeriod] = useState<any>(null);
  const [monitoringItems, setMonitoringItems] = useState<any[]>([]);

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState<any>(null);

  // Complaints & ITO state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [itoIssues, setItoIssues] = useState<any[]>([]);

  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin =
    role === "role_admin" ||
    role === "super_admin" ||
    role === "role_manager" ||
    role === "role_captain";

  const loadData = async () => {
    try {
      setLoading(true);
      const [monRes, heatRes, compRes, itoRes] = await Promise.all([
        fetch("/api/care/admin/monitoring"),
        fetch("/api/care/admin/heatmap"),
        fetch("/api/care/admin/complaints"),
        fetch("/api/care/admin/ito"),
      ]);

      const monJson = await monRes.json();
      const heatJson = await heatRes.json();
      const compJson = await compRes.json();
      const itoJson = await itoRes.json();

      if (monJson.ok) {
        setPeriod(monJson.data.period);
        setMonitoringItems(monJson.data.items || []);
      }
      if (heatJson.ok) setHeatmapData(heatJson.data);
      if (compJson.ok) setComplaints(compJson.data || []);
      if (itoJson.ok) setItoIssues(itoJson.data || []);
    } catch {
      setFeedback({ type: "err", message: "Gagal memuat data admin." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePeriod = async (action: "open" | "close") => {
    if (!period) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/care/admin/periods/${period.period_id}/${action}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `Gagal ${action} periode`);
      setFeedback({ type: "ok", message: `Periode berhasil di-${action}.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: "err", message: err instanceof Error ? err.message : "Gagal aksi" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToIto = async (complaintId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/care/admin/complaints/${complaintId}/to-ito`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "Sedang" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Gagal konversi ke ITO");
      setFeedback({ type: "ok", message: "Keluhan berhasil dijadikan Isu ITO!" });
      await loadData();
    } catch (err) {
      setFeedback({ type: "err", message: err instanceof Error ? err.message : "Gagal konversi" });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive">
        Akses Ditolak (403): Halaman ini khusus untuk Admin / Manajemen.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="KONTROL ADMIN" title="Administrasi Penilaian CARE" />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          kicker="KONTROL ADMIN"
          title="Manajemen Evaluasi CARE (Right People)"
          description="Monitoring pengisian staf, analisis heatmap dimensi, kelola periode, dan inbox keluhan/ITO."
        />

        {period && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            {period.status === "open" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleTogglePeriod("close")}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <Lock className="size-4" />
                <span>Tutup Periode ({period.period_key})</span>
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={() => handleTogglePeriod("open")}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <LockOpen className="size-4" />
                <span>Buka Periode ({period.period_key})</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
            feedback.type === "ok"
              ? "border-emerald/30 bg-emerald/10 text-emerald-900"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle className="size-4.5 shrink-0 mt-0.5 text-emerald" />
          ) : (
            <Warning className="size-4.5 shrink-0 mt-0.5 text-destructive" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="monitoring" className="text-xs">
            Monitoring Pengisian ({monitoringItems.length})
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="text-xs">
            Heatmap Dimensi
          </TabsTrigger>
          <TabsTrigger value="keluhan" className="text-xs">
            Keluhan & Isu ITO ({complaints.length} / {itoIssues.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Monitoring */}
        <TabsContent value="monitoring" className="space-y-4 pt-4">
          <div className="rounded-2xl border border-hairline bg-surface shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-hairline bg-canvas flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-ink uppercase">Status Pengisian Staf</h4>
                <p className="text-[11px] text-ash">
                  Periode aktif: {period?.label || "—"} ({period?.status === "open" ? "Buka" : "Tutup"})
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-emerald">
                  Terkirim: {monitoringItems.filter((i) => i.status === "submitted").length}
                </span>
                <span className="text-ash">•</span>
                <span className="font-semibold text-amber-600">
                  Draf: {monitoringItems.filter((i) => i.status === "draft").length}
                </span>
                <span className="text-ash">•</span>
                <span className="font-semibold text-destructive">
                  Belum: {monitoringItems.filter((i) => i.status === "belum").length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas/50 text-ash uppercase font-semibold border-b border-hairline">
                  <tr>
                    <th className="py-2.5 px-4">Nama Staf</th>
                    <th className="py-2.5 px-4">Posisi</th>
                    <th className="py-2.5 px-4">Status Pengisian</th>
                    <th className="py-2.5 px-4">Waktu Submit</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {monitoringItems.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-canvas/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink">{item.name}</td>
                      <td className="py-3 px-4 text-ash capitalize">
                        {item.role.replace("role_", "")}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === "submitted" ? (
                          <Badge variant="success" className="text-xs gap-1">
                            <CheckCircle className="size-3.5" />
                            Terkirim
                          </Badge>
                        ) : item.status === "draft" ? (
                          <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-700">
                            Sedang Mengisi (Draf)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Belum Mengisi
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-ash font-mono text-[11px]">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString("id-ID") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/care/profile/${item.employeeId}`)}
                          className="text-accent hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Lihat Hasil</span>
                          <ArrowRight className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Heatmap */}
        <TabsContent value="heatmap" className="space-y-4 pt-4">
          <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Matriks Heatmap Staf × 7 Dimensi</h4>
              <p className="text-xs text-ash mt-0.5">
                Peta visual kekuatan tim berdasarkan evaluasi yang telah disubmit. Klik baris untuk membuka profil detail.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-hairline">
                <thead className="bg-canvas border-b border-hairline text-ash uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Posisi</th>
                    <th className="py-2.5 px-3 text-center">Rata-rata</th>
                    <th className="py-2.5 px-3">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {heatmapData?.leaderboard?.map((row: any) => (
                    <tr
                      key={row.employeeId}
                      onClick={() => router.push(`/care/profile/${row.employeeId}`)}
                      className="cursor-pointer hover:bg-canvas/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-ink">{row.name}</td>
                      <td className="py-2.5 px-3 text-ash capitalize">
                        {row.role.replace("role_", "")}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-ink">
                        {formatScore(row.overallAverage)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-ink">{row.predicate.badge}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Keluhan & ITO */}
        <TabsContent value="keluhan" className="space-y-6 pt-4">
          {/* Complaints Inbox */}
          <div className="rounded-2xl border border-hairline bg-surface shadow-2xs overflow-hidden space-y-3 p-5">
            <h4 className="text-sm font-bold text-ink">Inbox Keluhan & Aspirasi Tim</h4>
            <div className="divide-y divide-hairline">
              {complaints.length === 0 ? (
                <p className="text-xs text-ash py-4 text-center">Belum ada keluhan masuk.</p>
              ) : (
                complaints.map((c) => (
                  <div key={c.complaint_id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-ink">{c.people?.name || "Anonim"}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {c.category}
                        </Badge>
                        <span className="text-[11px] text-ash">
                          {new Date(c.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>

                      {!c.ito_issue_id ? (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleConvertToIto(c.complaint_id)}
                          disabled={actionLoading}
                          className="text-xs"
                        >
                          Jadikan Isu ITO
                        </Button>
                      ) : (
                        <Badge variant="success" className="text-xs">
                          Sudah di ITO
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink/90 bg-canvas/40 p-3 rounded-lg border border-hairline">
                      &quot;{c.text}&quot;
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ITO Issues Table */}
          <div className="rounded-2xl border border-hairline bg-surface shadow-2xs overflow-hidden p-5 space-y-3">
            <h4 className="text-sm font-bold text-ink">Daftar Papan Isu ITO (Identify, Discuss, Solve)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-hairline text-ash uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Isu / Masalah</th>
                    <th className="py-2.5 px-3">Pelapor</th>
                    <th className="py-2.5 px-3">Prioritas</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Solusi / Action Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {itoIssues.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-ash text-xs">
                        Belum ada isu ITO.
                      </td>
                    </tr>
                  ) : (
                    itoIssues.map((ito) => (
                      <tr key={ito.ito_id} className="hover:bg-canvas/40">
                        <td className="py-3 px-3 font-semibold text-ink max-w-xs">{ito.issue}</td>
                        <td className="py-3 px-3 text-ash">{ito.reporter?.name || "—"}</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              ito.priority === "Tinggi"
                                ? "destructive"
                                : ito.priority === "Sedang"
                                ? "accent"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {ito.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              ito.status === "Selesai"
                                ? "success"
                                : ito.status === "Diskusi"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {ito.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-ash max-w-xs">
                          {ito.solution || "Menunggu kesepakatan sesi L10..."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
