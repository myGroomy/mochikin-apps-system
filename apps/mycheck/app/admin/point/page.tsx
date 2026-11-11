import { requireAdmin } from '@/lib/page-auth';
import { queryScoreLedger } from '@/lib/admin/scoring-service';
import { listAllUsers } from '@/lib/google/registry-admin';
import { asNum, asStr } from '@/lib/store';
import { PointDashboard, type LeaderboardUser } from '@mochikin/ui/points';
import { computeAnomalyScore } from '@mochikin/shared/points';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default async function AdminPointPage() {
  const ctx = await requireAdmin();
  const [ledger, users] = await Promise.all([
    queryScoreLedger({}, ctx.branchIds),
    listAllUsers().catch(() => []),
  ]);

  const userNames = new Map(users.map((u) => [u.User_ID, u.Nama || u.Username]));
  const byUser = new Map<string, { userId: string; name: string; items: number; points: number }>();

  for (const row of ledger) {
    if (asStr(row['scope_type']) !== 'user') continue;
    const metricType = asStr(row['metric_type']);
    if (metricType !== 'action' && metricType !== 'pj') continue;
    const userId = asStr(row['subject_id']);
    if (!userId) continue;

    const current = byUser.get(userId) ?? {
      userId,
      name: userNames.get(userId) || userId,
      items: 0,
      points: 0,
    };
    current.items += 1;
    current.points += Math.round(asNum(row['final_points']) ?? asNum(row['points_earned']) ?? 0);
    byUser.set(userId, current);
  }

  const rawLeaderboard = Array.from(byUser.values());

  // Calculate mean & stdDev for anomaly detection
  const totalPts = rawLeaderboard.reduce((s, u) => s + u.points, 0);
  const mean = totalPts / (rawLeaderboard.length || 1);
  const variance =
    rawLeaderboard.reduce((s, u) => s + Math.pow(u.points - mean, 2), 0) /
    (rawLeaderboard.length || 1);
  const stdDev = Math.sqrt(variance);

  const leaderboard: LeaderboardUser[] = rawLeaderboard
    .sort((a, b) => b.points - a.points)
    .map((u, index) => {
      const { isAnomaly } = computeAnomalyScore(u.points, mean, stdDev);
      return {
        rank: index + 1,
        userId: u.userId,
        name: u.name,
        totalPoints: u.points,
        itemsCount: u.items,
        isAnomaly,
      };
    });

  const totalPointsToday = rawLeaderboard.reduce((s, u) => s + u.points, 0);
  const totalItemsToday = rawLeaderboard.reduce((s, u) => s + u.items, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Admin
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl text-slate-900 dark:text-white">
            Poin & Performa Petugas MyCheck
          </h1>
          <p className="text-xs text-ink-muted sm:text-sm">
            Pantau kontribusi poin checklist SOP, efisiensi shift, dan audit laporan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/checklist/builder"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold hover:bg-canvas"
          >
            Checklist Builder (Setup Poin)
          </Link>
          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-xs hover:bg-primary/90"
          >
            Audit Laporan Shift <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <PointDashboard
        appName="mycheck"
        todayPoints={totalPointsToday}
        todayItemsCount={totalItemsToday}
        leaderboard={leaderboard}
      />
    </div>
  );
}
