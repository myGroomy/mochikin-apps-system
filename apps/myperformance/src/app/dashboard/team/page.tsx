"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle,
  ChatTeardropText,
  Package,
  Star,
  Warning,
  ArrowClockwise,
  UsersThree,
  Medal,
  ShieldCheck,
  SignIn,
  Storefront,
  ChartBar,
  Funnel,
  Info,
} from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

interface BranchItem {
  id: string;
  name: string;
  code: string;
}

type Period = "today" | "week" | "month" | "all";

const EMPTY_BREAKDOWN = {
  mycheck: 0,
  mycustomer: 0,
  stokis: 0,
  myperformance: 0,
};

function percentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function apiErrorMessage(payload: { error?: unknown }, fallback: string): string {
  const error = payload?.error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs shadow-2xs">
        🥇
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs">
        🥈
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-900 font-bold text-xs shadow-2xs">
        🥉
      </span>
    );
  }
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground font-mono font-semibold text-xs">
      #{rank}
    </span>
  );
}

export default function TeamPerformancePage() {
  const {
    status: sessionStatus,
    authenticated,
    personId,
    branchName,
    role,
    capabilities,
  } = useSession();

  const [period, setPeriod] = useState<Period>("month");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [mode, setMode] = useState<"overall" | "branch">("overall");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [appBreakdown, setAppBreakdown] = useState(EMPTY_BREAKDOWN);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const fetchCentralPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/points/central?period=${period}&branch_id=${selectedBranch}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(apiErrorMessage(data, "Gagal memuat data poin"));
      }

      setTotalPoints(data.totalPoints || 0);
      setAverageScore(data.averageScore || 0);
      setActiveStaffCount(data.activeStaffCount || 0);
      setAppBreakdown(data.appBreakdown || EMPTY_BREAKDOWN);
      setLeaderboard(data.leaderboard || []);
      setMode(data.mode || "overall");
      if (Array.isArray(data.branches) && data.branches.length > 0) {
        setBranches(data.branches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [period, selectedBranch]);

  useEffect(() => {
    if (sessionStatus !== "ready" || !authenticated || !capabilities.canViewTeamInsights) {
      setLoading(false);
      return;
    }
    void fetchCentralPoints();
  }, [fetchCentralPoints, sessionStatus, authenticated, capabilities.canViewTeamInsights]);

  const showAnomaly = capabilities.isAdmin;
  const canSeeTeam = capabilities.canViewTeamInsights;

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div>
        <PageHeader
          kicker="Dashboard Tim"
          title="Performa Tim"
          description="Rekap poin lintas aplikasi untuk seluruh anggota cabang."
          badge={<RoleBadge role={role} size="md" />}
        />
        <div className="mt-6">
          <EmptyState
            icon={SignIn}
            tone="locked"
            title="Masuk lewat Portal MyService"
            description="Rekap tim hanya tersedia untuk pengguna terautentikasi. Buka MyPerformance dari Portal MyService."
          />
        </div>
      </div>
    );
  }

  if (!canSeeTeam) {
    return (
      <div>
        <PageHeader
          kicker="Dashboard Tim"
          title="Performa Tim"
          description="Peringkat dan kontribusi anggota tim outlet."
          badge={<RoleBadge role={role} size="md" />}
          meta={branchName ?? undefined}
        />
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            tone="locked"
            title="Rekap tim khusus Supervisor & Admin"
            description="Sesuai kebijakan operasional, staf hanya dapat melihat skor pribadi. Hubungi Supervisor atau Admin jika membutuhkan informasi rekap tim."
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/me">
                  Buka Poin Saya
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Dashboard Analitik & Leaderboard"
        title="Statistik Kinerja Tim"
        description="Agregasi poin dari MyCheck (SOP), MyCustomer (CRM & Tamu), Stokis (Opname), dan CARE Scorecards."
        badge={<RoleBadge role={role} size="md" />}
        meta={
          mode === "overall"
            ? "Mode: Overall Statistics (Seluruh Cabang)"
            : `Mode: Branch Statistics (${branches.find((b) => b.id === selectedBranch)?.name || branchName || "Cabang"})`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchCentralPoints()}
              disabled={loading}
              className="gap-1.5"
            >
              <ArrowClockwise
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={capabilities.canManageScorecards ? "/scorecards/manage" : "/scorecards"}>
                <Medal className="size-4" aria-hidden="true" />
                <span>{capabilities.canManageScorecards ? "Kelola Scorecard" : "Buka Scorecard"}</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Analytics Scope Independence Banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/5 px-3.5 py-2.5 text-xs text-ink shadow-2xs">
        <Info className="size-4 text-accent shrink-0 mt-0.5" weight="duotone" />
        <div className="space-y-0.5">
          <span className="font-semibold text-accent">Analytics Scope Independence:</span>{" "}
          <span className="text-ash">
            Filter statistik di halaman ini murni merupakan cakupan analisis pandang (Analytics Scope) dan <strong>tidak mengubah Active Working Branch operasional Anda</strong>. Pergantian cabang kerja operasional hanya dilakukan via Portal MyService.
          </span>
        </div>
      </div>

      {/* Dual Filter Controls: Branch Filter & Period Filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-surface p-3.5 rounded-xl border border-hairline shadow-2xs">
        {/* Branch Filter & Mode Indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ash">
            <Storefront className="size-4 text-accent" weight="duotone" />
            <span>Cakupan Cabang:</span>
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={loading}
            className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
          >
            <option value="all">Semua Cabang (Overall Statistics)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                [{b.code}] {b.name}
              </option>
            ))}
          </select>

          <Badge
            variant={mode === "overall" ? "outline" : "accent"}
            className="text-[10px] uppercase font-bold tracking-wider"
          >
            {mode === "overall" ? "Overall Aggregation" : "Individual Branch"}
          </Badge>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ash">
            Periode:
          </span>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs px-2.5 py-1">Hari Ini</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5 py-1">7 Hari</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2.5 py-1">Bulan Ini</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">Semua</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-foreground"
        >
          <span className="flex items-center gap-2">
            <Warning className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void fetchCentralPoints()}
          >
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* 2-Column Mobile Scorecards Grid (Standardized responsive card grid) */}
      <section
        aria-label="Ringkasan poin dan metrik kinerja"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <StatCard
          label="Total Poin"
          value={totalPoints}
          unit="pts"
          icon={Trophy}
          tone="primary"
          hint={`${activeStaffCount} staf berkontribusi.`}
        />
        <StatCard
          label="Rata-Rata Performa"
          value={averageScore}
          unit="pts/staf"
          icon={ChartBar}
          tone="accent"
          hint="Rata-rata poin per staf aktif."
        />
        <StatCard
          label="MyCheck (SOP)"
          value={appBreakdown.mycheck}
          unit="pts"
          icon={CheckCircle}
          tone="accent"
          hint={`${percentage(appBreakdown.mycheck, totalPoints)}% dari total.`}
        />
        <StatCard
          label="MyCustomer (CRM)"
          value={appBreakdown.mycustomer}
          unit="pts"
          icon={ChatTeardropText}
          tone="success"
          hint={`${percentage(appBreakdown.mycustomer, totalPoints)}% dari total.`}
        />
        <StatCard
          label="Stokis (SO)"
          value={appBreakdown.stokis}
          unit="pts"
          icon={Package}
          tone="warning"
          hint={`${percentage(appBreakdown.stokis, totalPoints)}% dari total.`}
        />
        <StatCard
          label="CARE Scorecards"
          value={appBreakdown.myperformance}
          unit="pts"
          icon={Star}
          tone="neutral"
          hint={`${percentage(appBreakdown.myperformance, totalPoints)}% dari total.`}
        />
      </section>

      {/* Leaderboard Table Card */}
      <section className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs" aria-labelledby="leaderboard-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-muted/30 px-5 py-4">
          <div>
            <h2 id="leaderboard-heading" className="text-sm font-bold text-ink">
              Peringkat &amp; Distribusi Kontribusi Staf
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "overall"
                ? "Data teragregasi dari seluruh cabang tanpa duplikasi identitas staf (Zero Double Counting)."
                : `Data terisolasi untuk cabang ${branches.find((b) => b.id === selectedBranch)?.name || "terpilih"}.`}
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs font-medium">
            <UsersThree className="size-3.5" />
            <span>{leaderboard.length} staf tercatat</span>
          </Badge>
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : leaderboard.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Trophy}
              title="Belum ada transaksi poin tim"
              description="Tidak ada perolehan poin tercatat pada cakupan dan periode ini. Silakan pilih cabang atau periode lain."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchCentralPoints()}
                  className="gap-1.5"
                >
                  <ArrowClockwise className="size-3.5" />
                  Segarkan Data
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Nama Staf</TableHead>
                <TableHead className="text-center">MyCheck</TableHead>
                <TableHead className="text-center">MyCustomer</TableHead>
                <TableHead className="text-center">Stokis</TableHead>
                <TableHead className="text-center">Scorecard</TableHead>
                <TableHead className="text-right">Total Poin</TableHead>
                <TableHead className="text-right">Porsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((user) => {
                const isSelf = user.userId === personId;
                const anomaly = showAnomaly && user.isAnomaly;
                return (
                  <TableRow
                    key={user.userId}
                    className={cn(
                      isSelf && "bg-accent/5 font-medium",
                      anomaly && "bg-amber-50/50 dark:bg-amber-950/20"
                    )}
                  >
                    <TableCell className="text-center">
                      <RankBadge rank={user.rank} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{user.name}</span>
                        {isSelf && (
                          <Badge variant="accent" className="text-[10px] px-1.5 py-0 h-4">
                            Anda
                          </Badge>
                        )}
                        {anomaly && (
                          <Badge variant="warning" className="gap-1 text-[10px] px-1.5 py-0 h-4">
                            <Warning className="size-3" />
                            Anomali {typeof user.zScore === "number" ? `(${user.zScore.toFixed(1)})` : ""}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {user.mycheck}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {user.mycustomer}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {user.stokis}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {user.myperformance}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent justify-end shadow-2xs font-bold text-xs">
                        <div className="size-4 rounded bg-accent text-white flex items-center justify-center shrink-0">
                          <Trophy className="size-2.5" weight="fill" />
                        </div>
                        <span>+{user.total} pts</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {user.sharePercent}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
