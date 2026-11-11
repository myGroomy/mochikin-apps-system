"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  TrendUp,
  TrendDown,
  Lock,
  ChatCircleText,
  Target,
  ChatsCircle,
  CheckCircle,
  Warning,
  User,
  ArrowRight,
  FloppyDisk,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CareRadarChart } from "@/components/care/RadarChart";
import { formatScore } from "@/lib/care/scoring";

interface ProfileViewProps {
  employeeId?: string; // if omitted, loads 'me'
  isOwnProfile: boolean;
  currentUserRole: string;
}

export function CareProfileView({ employeeId, isOwnProfile, currentUserRole }: ProfileViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("nilai");
  const [allPeople, setAllPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Followup state
  const [strengthNote, setStrengthNote] = useState("");
  const [focusNote, setFocusNote] = useState("");
  const [actionItem, setActionItem] = useState("");
  const [savingFollowup, setSavingFollowup] = useState(false);

  const isAdmin =
    currentUserRole === "role_admin" ||
    currentUserRole === "super_admin" ||
    currentUserRole === "role_manager" ||
    currentUserRole === "role_captain";

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const url = employeeId ? `/api/care/profile/${employeeId}` : "/api/care/profile/me";
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setErrorMsg(json.error || "Gagal memuat profil");
          return;
        }

        setData(json.data);

        // If admin, load list of all people for dropdown switcher
        if (isAdmin) {
          const mRes = await fetch("/api/care/admin/monitoring");
          const mJson = await mRes.json();
          if (mJson.ok && mJson.data?.items) {
            setAllPeople(mJson.data.items.map((i: any) => ({ id: i.employeeId, name: i.name })));
          }
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [employeeId, isAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="RAPOR BUDAYA" title="Profil Hasil CARE" />
        <CardSkeleton />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-6 pb-20">
        <PageHeader kicker="RAPOR BUDAYA" title="Profil Hasil CARE" />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <Warning className="size-8 mx-auto text-destructive" />
          <p className="text-sm font-semibold text-destructive">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (data?.isLocked) {
    return (
      <div className="space-y-6 pb-20">
        <PageHeader kicker="RAPOR BUDAYA" title="Profil Hasil CARE" />
        <div className="rounded-2xl border border-hairline bg-surface p-12 text-center space-y-4 shadow-2xs">
          <Lock className="size-8 mx-auto text-ash" />
          <h3 className="text-base font-bold text-ink">Hasil Penilaian Masih Terkunci</h3>
          <p className="text-xs text-ash max-w-md mx-auto leading-relaxed">
            {data.message || "Hasil penilaian dibuka setelah periode ditutup dan dibahas di sesi 1:1."}
          </p>
        </div>
      </div>
    );
  }

  const { overallAverage, predicate, dimensionAverages, strengths, focus, trend, feedback, totalRaters } = data;

  // Radar points
  const radarData = Object.entries(dimensionAverages || {}).map(([dimId, val]: [string, any]) => ({
    dimension: dimId.charAt(0).toUpperCase() + dimId.slice(1),
    score: val.average || 3,
    fullMark: 4 as const,
  }));

  return (
    <div className="space-y-6 pb-20">
      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          kicker="RAPOR BUDAYA CARE"
          title={isOwnProfile ? "Profil Budaya Kerja Saya" : "Profil Hasil Penilaian Staf"}
          description="Kompilasi kualitatif 7 dimensi, kekuatan utama, area pengembangan, dan masukan rekan."
        />

        {/* Admin Switcher Dropdown */}
        {isAdmin && allPeople.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold text-ash">Lihat Profil:</span>
            <select
              value={employeeId || ""}
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/care/profile/${e.target.value}`);
                } else {
                  router.push("/care/profile");
                }
              }}
              className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
            >
              <option value="">Profil Saya Sendiri</option>
              {allPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Rata-rata Skor */}
        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-ash uppercase">Rata-rata Skor</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-ink">
              {formatScore(overallAverage)}
            </span>
            <span className="text-xs text-ash">/ 4.0</span>
          </div>
          <p className="text-[11px] text-ash">Target kelulusan standar: 3.0</p>
        </div>

        {/* Predikat */}
        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-ash uppercase">Predikat Evaluasi</span>
          <div>
            <span className="text-lg font-bold text-ink">{predicate?.badge || "—"}</span>
          </div>
          <p className="text-[11px] text-ash leading-snug">{predicate?.meaning}</p>
        </div>

        {/* Tren Periode */}
        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-ash uppercase">Tren vs Periode Lalu</span>
          <div className="flex items-center gap-2">
            {trend?.direction === "up" ? (
              <span className="flex items-center gap-1 font-mono text-2xl font-bold text-emerald">
                <TrendUp className="size-6" />
                +{trend.diff}
              </span>
            ) : trend?.direction === "down" ? (
              <span className="flex items-center gap-1 font-mono text-2xl font-bold text-destructive">
                <TrendDown className="size-6" />
                {trend.diff}
              </span>
            ) : (
              <span className="font-mono text-2xl font-bold text-ash">Stabil (0.0)</span>
            )}
          </div>
          <p className="text-[11px] text-ash">Total {totalRaters || 0} penilai terverifikasi</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="nilai" className="text-xs">
            Nilai Saya
          </TabsTrigger>
          <TabsTrigger value="masukan" className="text-xs">
            Masukan Rekan ({feedback?.length || 0})
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="keluhan" className="text-xs">
              Keluhan Saya
            </TabsTrigger>
          )}
          <TabsTrigger value="tindak-lanjut" className="text-xs">
            Tindak Lanjut
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Nilai & Radar */}
        <TabsContent value="nilai" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-2xs space-y-4 flex flex-col items-center justify-center">
              <h3 className="text-sm font-bold text-ink self-start">Peta Radar 7 Dimensi</h3>
              <CareRadarChart data={radarData} size={280} />
            </div>

            {/* Kekuatan & Fokus Pengembangan */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald/30 bg-emerald/5 p-5 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald">
                  <Sparkle className="size-5" />
                  <h4 className="text-sm font-bold">Kekuatan Utama (Top 2)</h4>
                </div>
                <p className="text-xs text-ash leading-relaxed">
                  Dimensi di mana Anda dinilai paling konsisten dan unggul oleh rekan kerja:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(strengths || []).map((s: string) => (
                    <Badge key={s} variant="success" className="capitalize text-xs font-bold">
                      🌟 {s} ({formatScore(dimensionAverages?.[s]?.average)})
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <Target className="size-5" />
                  <h4 className="text-sm font-bold">Fokus Pengembangan (Area Prioritas)</h4>
                </div>
                <p className="text-xs text-ash leading-relaxed">
                  Area yang paling membutuhkan dukungan pembinaan konkret untuk 30-60 hari ke depan:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(focus || []).map((f: string) => (
                    <Badge key={f} variant="outline" className="capitalize text-xs font-bold border-amber-500 text-amber-800">
                      🎯 {f} ({formatScore(dimensionAverages?.[f]?.average)})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Masukan Rekan (Anonim untuk Staf) */}
        <TabsContent value="masukan" className="space-y-4 pt-4">
          <div className="rounded-xl border border-hairline bg-surface p-4 text-xs text-ash">
            {isAdmin ? (
              <p className="font-semibold text-accent">
                Mode Admin: Nama penilai ditampilkan untuk keperluan audit & pemantauan 1:1.
              </p>
            ) : (
              <p>
                Seluruh masukan rekan kerja ditampilkan secara anonim untuk menjaga keterbukaan dan objektivitas evaluasi.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {(!feedback || feedback.length === 0) ? (
              <div className="rounded-xl border border-hairline bg-surface p-8 text-center text-xs text-ash">
                Belum ada catatan deskripsi yang masuk pada periode ini.
              </div>
            ) : (
              feedback.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-hairline bg-surface p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs capitalize text-ink">
                        {item.dimensionId}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        Skor: {item.score}
                      </Badge>
                    </div>

                    <span className="text-[11px] font-semibold text-ash">
                      Dari: {item.raterName}
                    </span>
                  </div>

                  <p className="text-xs text-ink/90 leading-relaxed bg-canvas/40 p-3 rounded-lg border border-hairline/60">
                    &quot;{item.note}&quot;
                  </p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Keluhan Saya */}
        {isOwnProfile && (
          <TabsContent value="keluhan" className="space-y-4 pt-4">
            <div className="rounded-xl border border-hairline bg-surface p-5 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-ink">Riwayat Keluhan Anda</h4>
              <p className="text-xs text-ash leading-relaxed">
                Keluhan Anda diteruskan ke papan ITO untuk dicari solusinya bersama Captain dan Manajemen.
              </p>
            </div>
          </TabsContent>
        )}

        {/* Tab 4: Tindak Lanjut */}
        <TabsContent value="tindak-lanjut" className="space-y-4 pt-4">
          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Rencana Pengembangan & Action Item 30-60 Hari</h4>
              <p className="text-xs text-ash mt-0.5">
                Target konkret hasil diskusi 1:1 untuk pengembangan performa kerja.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Target Peningkatan Utama:</label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  value={actionItem}
                  onChange={(e) => setActionItem(e.target.value)}
                  placeholder="Target konkret perbaikan perilaku atau operasional gerai..."
                  className="w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-ink outline-none focus:border-accent disabled:opacity-80"
                />
              </div>

              {isAdmin && (
                <Button variant="accent" size="sm" className="gap-1.5">
                  <FloppyDisk className="size-4" />
                  <span>Simpan Tindak Lanjut</span>
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
