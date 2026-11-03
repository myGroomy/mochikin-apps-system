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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [appBreakdown, setAppBreakdown] = useState(EMPTY_BREAKDOWN);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const fetchCentralPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/points/central?period=${period}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(apiErrorMessage(data, "Gagal memuat data poin"));
      }

      setTotalPoints(data.totalPoints || 0);
      setActiveStaffCount(data.activeStaffCount || 0);
      setAppBreakdown(data.appBreakdown || EMPTY_BREAKDOWN);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            title="Masuk lewat Portal Mochikin"
            description="Rekap tim hanya tersedia untuk pengguna terautentikasi. Buka MyPerformance dari Portal Mochikin Services."
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
        kicker="Dashboard Kolaborasi Tim"
        title="Leaderboard & Kinerja Tim"
        description="Agregasi poin dari MyCheck (SOP), MyCustomer (CRM & Kontak), Stokis (Opname), dan CARE Scorecards."
        badge={<RoleBadge role={role} size="md" />}
        meta={branchName ?? undefined}
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

      {/* Filter and Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Periode:
          </span>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="today">Hari Ini</TabsTrigger>
              <TabsTrigger value="week">7 Hari</TabsTrigger>
              <TabsTrigger value="month">Bulan Ini</TabsTrigger>
              <TabsTrigger value="all">Semua</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {!showAnomaly ? (
          <p className="text-xs text-muted-foreground">
            Rekap performa dihitung berdasarkan aktivitas terverifikasi sistem.
          </p>
        ) : null}
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

      {/* 5 App Breakdown Cards */}
      <section aria-label="Ringkasan poin" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Poin Tim"
          value={totalPoints}
          unit="pts"
          icon={Trophy}
          tone="primary"
          hint={`${activeStaffCount} staf aktif berkontribusi.`}
        />
        <StatCard
          label="MyCheck (SOP)"
          value={appBreakdown.mycheck}
          unit="pts"
          icon={CheckCircle}
          tone="accent"
          hint={`${percentage(appBreakdown.mycheck, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="MyCustomer (CRM)"
          value={appBreakdown.mycustomer}
          unit="pts"
          icon={ChatTeardropText}
          tone="success"
          hint={`${percentage(appBreakdown.mycustomer, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="Stokis (SO)"
          value={appBreakdown.stokis}
          unit="pts"
          icon={Package}
          tone="warning"
          hint={`${percentage(appBreakdown.stokis, totalPoints)}% dari total poin.`}
        />
        <StatCard
          label="Scorecards"
          value={appBreakdown.myperformance}
          unit="pts"
          icon={Star}
          tone="neutral"
          hint={`${percentage(appBreakdown.myperformance, totalPoints)}% dari total poin.`}
        />
      </section>

      {/* Leaderboard Table Card */}
      <section className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs" aria-labelledby="leaderboard-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-muted/30 px-5 py-4">
          <div>
            <h2 id="leaderboard-heading" className="text-sm font-bold text-ink">
              Peringkat &amp; Kontribusi Staf
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribusi poin antar anggota tim berdasarkan data transaksi terintegrasi.
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
              description="Tidak ada perolehan poin tercatat pada periode ini. Silakan coba pilih periode lain."
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
