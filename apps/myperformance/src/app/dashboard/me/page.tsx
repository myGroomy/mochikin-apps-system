"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ClipboardText,
  SignIn,
  ArrowClockwise,
  ShieldCheck,
  UsersThree,
  Sparkle,
} from "@phosphor-icons/react";
import PointsDashboard from "@/components/PointsDashboard";
import PointsHistory from "@/components/PointsHistory";
import { useSession } from "@/components/session/SessionProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";

export default function MyPerformancePage() {
  const {
    status,
    authenticated,
    personId,
    name,
    branchName,
    role,
    capabilities,
    refresh,
  } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      setRefreshKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <CardSkeleton rows={2} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          kicker="Dashboard Kinerja"
          title="Poin Saya"
          description="Akumulasi poin harian dan riwayat performa operasional pribadi."
          badge={<RoleBadge role={role} size="md" />}
        />
        <div className="mt-6">
          <EmptyState
            icon={status === "error" ? ShieldCheck : SignIn}
            tone="locked"
            title={status === "error" ? "Sesi tidak dapat dimuat" : "Masuk lewat Portal MyService"}
            description={
              status === "error"
                ? "Server tidak dapat memverifikasi sesi saat ini. Coba muat ulang sesi atau login kembali."
                : "Poin pribadi hanya dapat diakses oleh staf terautentikasi. Buka MyPerformance dari Portal MyService."
            }
            action={
              <Button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                size="sm"
                className="gap-2"
              >
                <ArrowClockwise
                  className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {refreshing ? "Memeriksa Sesi…" : "Muat Ulang Sesi"}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const meta = [name, branchName].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Dashboard Kinerja Staf"
        title="Poin Saya"
        description="Akumulasi poin kerja harian dari seluruh aplikasi (MyCheck, Stokis, MyCustomer) dan riwayat rollup pribadi."
        badge={<RoleBadge role={role} size="md" />}
        meta={meta || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="gap-1.5"
            >
              <ArrowClockwise
                className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/scorecards">
                <ClipboardText className="size-4" aria-hidden="true" />
                <span>Evaluasi CARE</span>
              </Link>
            </Button>
          </div>
        }
      />

      {capabilities.canViewTeamInsights ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-4 text-xs text-foreground shadow-2xs">
          <span className="flex items-center gap-2.5">
            <UsersThree className="size-4.5 text-accent shrink-0" weight="duotone" />
            <span>
              Sebagai <strong>{capabilities.canViewScorecardDetail ? "Admin Pusat" : "Supervisor Cabang"}</strong>, Anda memiliki wewenang memantau rekap skor dan leaderboard seluruh kru.
            </span>
          </span>
          <Button asChild variant="outline" size="xs">
            <Link href="/dashboard/team">
              Buka Leaderboard Tim
            </Link>
          </Button>
        </div>
      ) : null}

      <PointsDashboard personId={personId} refreshKey={refreshKey} />

      <section className="space-y-3 pt-2">
        <PointsHistory personId={personId} refreshKey={refreshKey} />
      </section>
    </div>
  );
}
