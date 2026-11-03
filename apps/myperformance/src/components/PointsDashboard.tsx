"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Lightning,
  TrendUp,
  Clock,
  CalendarBlank,
  ArrowClockwise,
  Pulse,
  CheckCircle,
  ChartBar,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface TodayPointsResponse {
  success: boolean;
  data?: { person_id: string; date: string; today_points: number; source: "redis" | "ledger" };
  error?: { code: string; message: string } | string;
}

export interface MonthlySummaryResponse {
  success: boolean;
  data?: {
    personId: string;
    branchId: string;
    month: string;
    monthTotalPoints: number;
    monthEventCount: number;
    monthTotal: number;
    monthTarget: number;
    progressPercent: number;
    effectiveHoursPerMonth: number;
    estimatedEffectiveHours: number;
    pointsNeededForTarget: number;
    todayPoints: number;
    todaySource: "redis" | "ledger" | "none";
  };
  error?: { code: string; message: string } | string;
}

interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

function formatPeriodKey(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PointsDashboard({
  personId,
  refreshKey = 0,
}: {
  personId?: string | null;
  refreshKey?: number;
}) {
  const [todayPoints, setTodayPoints] = useState(0);
  const [todaySource, setTodaySource] = useState<"redis" | "ledger">("ledger");
  const [todayDate, setTodayDate] = useState("");
  const [summary, setSummary] = useState<MonthlySummaryResponse["data"] | null>(null);
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [todayRes, summaryRes, rollupRes] = await Promise.all([
        fetch("/api/points/me/today", { cache: "no-store" }),
        fetch("/api/points/me/summary", { cache: "no-store" }),
        personId
          ? fetch(`/api/points/${personId}/rollup?period_type=day&limit=30`, {
              cache: "no-store",
            })
          : Promise.resolve(null),
      ]);

      const todayJson = (await todayRes.json()) as TodayPointsResponse;
      if (!todayRes.ok || !todayJson.success || !todayJson.data) {
        throw new Error(
          typeof todayJson.error === "string"
            ? todayJson.error
            : todayJson.error?.message || "Gagal memuat poin hari ini"
        );
      }
      setTodayPoints(Number(todayJson.data.today_points || 0));
      setTodaySource(todayJson.data.source);
      setTodayDate(todayJson.data.date);

      const summaryJson = (await summaryRes.json()) as MonthlySummaryResponse;
      if (!summaryRes.ok || !summaryJson.success || !summaryJson.data) {
        throw new Error(
          typeof summaryJson.error === "string"
            ? summaryJson.error
            : summaryJson.error?.message || "Gagal memuat ringkasan bulanan"
        );
      }
      setSummary(summaryJson.data);

      if (rollupRes) {
        const rollupJson = await rollupRes.json();
        setRollups(rollupJson.success ? rollupJson.data?.rollups ?? [] : []);
      } else {
        setRollups([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const monthlyTarget = Number(process.env.NEXT_PUBLIC_MONTHLY_POINTS_TARGET || 1044);
  const monthTotal = Number(summary?.monthTotal ?? 0);
  const progressPercent =
    summary && Number(summary.monthTarget || monthlyTarget) > 0
      ? Math.min(100, (monthTotal / Number(summary.monthTarget || monthlyTarget)) * 100)
      : 0;

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-foreground"
        >
          <span className="flex items-center gap-2">
            <Pulse className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void load()}
            className="gap-1.5"
          >
            <ArrowClockwise className="size-3" aria-hidden="true" />
            Coba lagi
          </Button>
        </div>
      ) : null}

      {/* 3 Metric Cards */}
      <section aria-label="Ringkasan poin pribadi" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Poin Hari Ini"
          value={todayPoints.toFixed(2)}
          unit="pts"
          icon={Lightning}
          tone="primary"
          hint={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/30 text-accent bg-accent/5">
                {todaySource === "redis" ? "Realtime (T+0)" : "Ledger"}
              </Badge>
              <span>
                {todayDate
                  ? new Date(`${todayDate}T00:00:00`).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Hari ini"}
              </span>
            </span>
          }
        />
        <StatCard
          label="Akumulasi Bulan Ini"
          value={monthTotal.toFixed(2)}
          unit="pts"
          icon={TrendUp}
          tone="accent"
          hint={`${progressPercent.toFixed(1)}% dari target ${Number(
            summary?.monthTarget ?? monthlyTarget
          )} poin.`}
        />
        <StatCard
          label="Estimasi Jam Efektif"
          value={(summary?.estimatedEffectiveHours ?? 0).toFixed(1)}
          unit="jam"
          icon={Clock}
          tone="neutral"
          hint={`${summary?.monthEventCount ?? 0} aktivitas dari standar ${
            summary?.effectiveHoursPerMonth ?? 173
          } jam/bln.`}
        />
      </section>

      {/* Monthly Progress Card */}
      <section className="rounded-xl border border-hairline bg-surface p-5 shadow-xs" aria-labelledby="monthly-progress-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="monthly-progress-heading" className="text-sm font-bold text-ink">
                Progres Target Bulanan
              </h2>
              {progressPercent >= 100 && (
                <Badge variant="success" className="gap-1 text-[10px] py-0">
                  <CheckCircle className="size-3" weight="fill" />
                  Target Tercapai
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary?.pointsNeededForTarget
                ? `${Number(summary.pointsNeededForTarget).toFixed(2)} poin lagi untuk mencapai batas aman kinerja.`
                : "Selamat! Target kinerja bulan ini telah terlampaui."}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tracking-tight text-ink font-mono">
              {progressPercent.toFixed(1)}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">%</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted border border-hairline"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label="Progres target poin bulanan"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              progressPercent >= 80
                ? "bg-emerald-600"
                : progressPercent >= 50
                  ? "bg-accent"
                  : "bg-amber-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-2.5 flex justify-between text-xs text-muted-foreground font-medium">
          <span className="font-mono">
            {monthTotal.toFixed(2)} / {Number(summary?.monthTarget ?? monthlyTarget)} pts
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarBlank className="size-3.5" aria-hidden="true" />
            {summary?.month ?? "Bulan berjalan"}
          </span>
        </div>
      </section>

      {/* Daily Transaction History */}
      <section className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs" aria-labelledby="daily-history-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-muted/30 px-5 py-3.5">
          <div>
            <h2 id="daily-history-heading" className="text-sm font-bold text-ink">
              Riwayat Rollup Harian
            </h2>
            <p className="text-xs text-muted-foreground">
              Log 30 periode harian terakhir yang terekam di ledger terpusat.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {rollups.length} entri
          </Badge>
        </div>

        {rollups.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Pulse}
              title="Belum ada data rollup"
              description="Rollup harian akan muncul otomatis setelah ada aktivitas operasional (MyCheck / Stokis / MyCustomer) yang tersinkronisasi."
              compact
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Frekuensi Aktivitas</TableHead>
                <TableHead className="text-right">Total Unit</TableHead>
                <TableHead className="text-right">Akumulasi Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollups.map((rollup) => (
                <TableRow key={`${rollup.period_key}-${rollup.event_count}`}>
                  <TableCell className="font-semibold text-ink">
                    {formatPeriodKey(rollup.period_key)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rollup.event_count} aktivitas operasional
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {rollup.total_quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 justify-end shadow-2xs font-bold text-xs">
                      <div className="size-4 rounded bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <ChartBar className="size-2.5" weight="fill" />
                      </div>
                      <span>+{Number(rollup.total_points).toFixed(2)} pts</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
