import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
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
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // 'today' | 'week' | 'month' | 'all'
    const branchId = searchParams.get('branch_id');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        totalPoints: 0,
        appBreakdown: { mycheck: 0, mycustomer: 0, stokis: 0, myperformance: 0 },
        leaderboard: [],
        message: 'Database tidak terhubung',
      });
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
    if (logsErr) throw logsErr;

    // 2. Ambil master data people
    const userIds = Array.from(new Set((logs || []).map((l) => l.user_id)));
    let userMap: Record<string, { name: string; branch?: string }> = {};
    if (userIds.length > 0) {
      const { data: people } = await supabase
        .from('people')
        .select('id, name, branch_id');
      if (people) {
        people.forEach((p) => {
          userMap[p.id] = { name: p.name, branch: p.branch_id };
        });
      }
    }

    // 3. Agregasi Poin per App
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

    return NextResponse.json({
      success: true,
      period,
      totalPoints,
      activeStaffCount: leaderboard.length,
      appBreakdown,
      leaderboard: leaderboardWithAnomaly,
      logsCount: logs?.length || 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
