import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { getRoleCapabilities } from '@/lib/roles';
import { computeAnomalyScore } from '@mochikin/shared';
import {
  combineTeamPointSources,
  type MyCustomerLegacyPointRow,
  type TeamLedgerRow,
} from '@/lib/integration/team-points';

const PAGE_SIZE = 1000;

function getTodayJakarta(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function jakartaMidnight(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toISOString();
}

function getPeriodRange(period: string, today: string) {
  if (period === 'all') return null;
  const startDate =
    period === 'today' ? today : addDays(today, period === 'week' ? -6 : -29);
  const endDate = addDays(today, 1);
  return {
    startDate,
    endDate,
    startAt: jakartaMidnight(startDate),
    endAt: jakartaMidnight(endDate),
  };
}

interface PageResult<T> {
  data: T[] | null;
  error: { code?: string | null; message: string } | null;
}

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw Object.assign(new Error(error.message), { code: error.code });
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function isMissingTable(error: unknown, table: string): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === 'PGRST205' ||
    (message.toLowerCase().includes('could not find the table') &&
      message.toLowerCase().includes(table.toLowerCase()))
  );
}

export async function GET(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (!authResult.ok) return authResult.response;

    const { auth } = authResult;
    const capabilities = getRoleCapabilities(auth.role);
    if (!capabilities.canViewTeamInsights) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak: rekap performa dan analitik tim hanya untuk Kapten ke atas.',
        },
        { status: 403 }
      );
    }

    if (!capabilities.canViewAllBranches && !auth.branchId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun belum terhubung ke cabang. Hubungi admin untuk melengkapi profil.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // 'today' | 'week' | 'month' | 'all'
    const requestedBranch = searchParams.get('branch_id');
    if (!['today', 'week', 'month', 'all'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Periode poin tidak valid.' },
        { status: 400 }
      );
    }

    // Branch context independence:
    // If user has viewAllBranches permission, they can view 'all' (Overall Statistics) or any specific branch.
    // If not, they are pinned to their branch unless multi-branch assigned.
    const isOverall = capabilities.canViewAllBranches && (!requestedBranch || requestedBranch === 'all');
    const branchId = isOverall ? null : (capabilities.canViewAllBranches ? requestedBranch : auth.branchId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        totalPoints: 0,
        averageScore: 0,
        appBreakdown: { mycheck: 0, mycustomer: 0, stokis: 0, myperformance: 0 },
        leaderboard: [],
        branches: [],
        mode: isOverall ? 'overall' : 'branch',
        message: 'Database tidak terhubung',
      });
    }

    // Fetch branches list for selector filter
    let availableBranches: Array<{ id: string; name: string; code: string }> = [];
    try {
      const { data: bData } = await supabase
        .from('branches')
        .select('id, name, code')
        .order('name', { ascending: true });
      if (bData) {
        availableBranches = bData;
      }
    } catch {
      // Best-effort
    }

    const today = getTodayJakarta();
    const dateRange = getPeriodRange(period, today);
    let ledgerRows: TeamLedgerRow[];
    try {
      ledgerRows = await fetchAllPages<TeamLedgerRow>((from, to) => {
        let query = supabase
          .from('point_ledger')
          .select('person_id, branch_id, source_app, points, occurred_at')
          .order('occurred_at', { ascending: false })
          .range(from, to);
        if (dateRange) {
          query = query
            .gte('shift_date', dateRange.startDate)
            .lt('shift_date', dateRange.endDate);
        }
        if (branchId) query = query.eq('branch_id', branchId);
        return query;
      });
    } catch (error) {
      if (isMissingTable(error, 'point_ledger')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Tabel point_ledger belum tersedia. Terapkan migrasi 009_myperformance_schema.sql.',
          },
          { status: 503 }
        );
      }
      throw error;
    }

    let myCustomerLegacyRows: MyCustomerLegacyPointRow[] = [];
    let legacyPointsUnavailable = false;
    try {
      myCustomerLegacyRows = await fetchAllPages<MyCustomerLegacyPointRow>((from, to) => {
        let query = supabase
          .from('point_logs')
          .select('user_id, branch_id, app_id, points_earned, created_at')
          .eq('app_id', 'mycustomer')
          .order('created_at', { ascending: false })
          .range(from, to);
        if (dateRange) {
          query = query
            .gte('created_at', dateRange.startAt)
            .lt('created_at', dateRange.endAt);
        }
        if (branchId) query = query.eq('branch_id', branchId);
        return query;
      });
    } catch (error) {
      if (!isMissingTable(error, 'point_logs')) throw error;
      legacyPointsUnavailable = true;
    }

    const rows = combineTeamPointSources(ledgerRows, myCustomerLegacyRows);

    // 2. Ambil master data people
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
    let userMap: Record<string, { name: string; branch?: string }> = {};
    if (userIds.length > 0) {
      const { data: people, error: peopleError } = await supabase
        .from('people')
        .select('id, name, branch_id')
        .in('id', userIds);
      if (peopleError) throw peopleError;
      if (people) {
        people.forEach((p) => {
          userMap[p.id] = { name: p.name, branch: p.branch_id };
        });
      }
    }

    // 3. Agregasi Poin per App & Staf (No double counting)
    const appBreakdown = {
      mycheck: 0,
      mycustomer: 0,
      stokis: 0,
      myperformance: 0,
    };

    let totalPoints = 0;
    const userScores: Record<
      string,
      {
        userId: string;
        name: string;
        total: number;
        mycheck: number;
        mycustomer: number;
        stokis: number;
        myperformance: number;
      }
    > = {};

    rows.forEach((l) => {
      const pts = l.points_earned;
      totalPoints += pts;

      const appKey = l.app_id as keyof typeof appBreakdown;
      if (appKey in appBreakdown) {
        appBreakdown[appKey] += pts;
      }

      if (!userScores[l.user_id]) {
        userScores[l.user_id] = {
          userId: l.user_id,
          name: userMap[l.user_id]?.name || `Petugas (${l.user_id.slice(0, 6)})`,
          total: 0,
          mycheck: 0,
          mycustomer: 0,
          stokis: 0,
          myperformance: 0,
        };
      }

      userScores[l.user_id].total += pts;
      if (userScores[l.user_id][appKey] !== undefined) {
        userScores[l.user_id][appKey] += pts;
      }
    });

    const leaderboard = Object.values(userScores).sort((a, b) => b.total - a.total);
    const staffCount = leaderboard.length;
    const averageScore = staffCount > 0 ? Number((totalPoints / staffCount).toFixed(1)) : 0;

    // 4. Deteksi Anomali
    const pointValues = leaderboard.map((u) => u.total);
    const n = pointValues.length;
    const mean = n > 0 ? pointValues.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? pointValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    const leaderboardWithAnomaly = leaderboard.map((u, idx) => {
      const anomaly = computeAnomalyScore(u.total, mean, stdDev);
      return {
        ...u,
        rank: idx + 1,
        sharePercent: totalPoints > 0 ? Number(((u.total / totalPoints) * 100).toFixed(1)) : 0,
        isAnomaly: anomaly.isAnomaly,
        zScore: anomaly.zScore,
      };
    });

    const selectedBranchObj = availableBranches.find((b) => b.id === branchId);

    return NextResponse.json({
      success: true,
      period,
      mode: isOverall ? 'overall' : 'branch',
      selectedBranchId: branchId || 'all',
      selectedBranchName: selectedBranchObj ? selectedBranchObj.name : (isOverall ? 'Semua Cabang' : 'Cabang Aktif'),
      branches: availableBranches,
      canFilterBranches: capabilities.canViewAllBranches,
      totalPoints,
      averageScore,
      activeStaffCount: staffCount,
      appBreakdown,
      leaderboard: leaderboardWithAnomaly,
      logsCount: rows.length,
      warnings: legacyPointsUnavailable
        ? ['Tabel point_logs tidak tersedia; poin legacy MyCustomer tidak dapat ditampilkan.']
        : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
