"use client";

import { useCallback, useEffect, useState } from "react";
import { Pulse, CalendarBlank, ArrowClockwise, ChartBar } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
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

export interface RollupRow {
  period_key: string;
  period_type: string;
  total_points: number;
  total_quantity: number;
  event_count: number;
}

type PeriodType = "day" | "month" | "year";

function formatPeriodKey(key: string, periodType: PeriodType): string {
  if (periodType === "day" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const date = new Date(`${key}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  return key;
}

export default function PointsHistory({
  personId,
  refreshKey = 0,
}: {
  personId?: string | null;
  refreshKey?: number;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!personId) {
      setRollups([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/points/${personId}/rollup?period_type=${periodType}&limit=24`,
        { cache: "no-store" }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal memuat riwayat poin");
      }

      const rows: RollupRow[] = json.data?.rollups ?? [];
      setRollups(rows);
      setTotal(json.data?.total_points ?? rows.reduce((acc, r) => acc + Number(r.total_points), 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, [personId, periodType]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-muted/30 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-ink">
            Riwayat Akumulasi Terstruktur
          </h2>
          <p className="text-xs text-muted-foreground">
            Perbandingan akumulasi poin berdasarkan interval waktu pilihan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs
            value={periodType}
            onValueChange={(v) => setPeriodType(v as PeriodType)}
          >
            <TabsList>
              <TabsTrigger value="day">Harian</TabsTrigger>
              <TabsTrigger value="month">Bulanan</TabsTrigger>
              <TabsTrigger value="year">Tahunan</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void load()}
            title="Refresh riwayat"
          >
            <ArrowClockwise className="size-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : error ? (
        <div className="p-6">
          <EmptyState
            icon={Pulse}
            tone="error"
            title="Gagal memuat riwayat"
            description={error}
            action={
              <Button variant="outline" size="xs" onClick={() => void load()}>
                Coba Lagi
              </Button>
            }
          />
        </div>
      ) : rollups.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={ChartBar}
            title="Belum ada riwayat"
            description="Riwayat periode ini masih kosong."
            compact
          />
        </div>
      ) : (
        <>
          <div className="px-5 py-3 border-b border-hairline bg-surface flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Total {rollups.length} periode tercatat
            </span>
            <span className="font-semibold text-ink font-mono">
              Total: {Number(total).toFixed(2)} pts
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Jumlah Aktivitas</TableHead>
                <TableHead className="text-right">Unit Tercatat</TableHead>
                <TableHead className="text-right">Total Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rollups.map((r) => (
                <TableRow key={r.period_key}>
                  <TableCell className="font-semibold text-ink">
                    {formatPeriodKey(r.period_key, periodType)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.event_count} aktivitas
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {r.total_quantity}
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-accent">
                    +{Number(r.total_points).toFixed(2)} pts
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  );
}
