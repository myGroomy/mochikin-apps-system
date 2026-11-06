import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { getRoleCapabilities } from '@/lib/roles';
import { computeAnomalyScore } from '@mochikin/shared';

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
    let startDate: string | null = null;

    if (period === 'today') {
      startDate = `${today}T00:00:00.000Z`;
    } else if (period === 'week') {
      const d = new Date(Date.now() - 7 * 86400000);
      startDate = `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
    } else if (period === 'month') {
      const d = new Date(Date.now() - 30 * 86400000);
      startDate = `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
    }

    // 1. Ambil point_logs lintas aplikasi
    let query = supabase
      .from('point_logs')
      .select('id, app_id, user_id, branch_id, points_earned, points_original, activity_type, created_at')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: logs, error: logsErr } = await query;
    if (logsErr) {
      const missingTable =
        logsErr.code === 'PGRST205' ||
        /could not find the table .*point_logs/i.test(logsErr.message);
      if (missingTable) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Tabel point_logs belum tersedia. Terapkan migrasi 010_points_system.sql sebelum memakai rekap tim.',
          },
          { status: 503 }
        );
      }
      throw logsErr;
    }

    // 2. Ambil master data people
    const userIds = Array.from(new Set((logs || []).map((l) => l.user_id)));
    let userMap: Record<string, { name: string; branch?: string }> = {};
    if (userIds.length > 0) {
      const { data: people } = await supabase
        .from('people')
        .select('id, name, branch_id')
        .in('id', userIds);
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

    (logs || []).forEach((l) => {
      const pts = Number(l.points_earned || 0);
      totalPoints += pts;

      const appKey = (l.app_id || 'mycheck') as keyof typeof appBreakdown;
      if (appBreakdown[appKey] !== undefined) {
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
      logsCount: logs?.length || 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
