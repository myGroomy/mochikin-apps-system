import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
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
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        todayPoints: 0,
        weeklyPoints: 0,
        totalReports: 0,
        pendingAudits: 0,
        contributors: [],
        recentReports: [],
      });
    }

    const today = getTodayJakarta();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // 1. Ambil point_logs 7 hari terakhir untuk stokis
    const { data: logs } = await supabase
      .from('point_logs')
      .select('id, user_id, points_earned, created_at')
      .eq('app_id', 'stokis')
      .gte('created_at', `${sevenDaysAgo}T00:00:00.000Z`)
      .order('created_at', { ascending: false });

    const todayLogs = (logs || []).filter((l) => l.created_at.startsWith(today));
    const todayPoints = todayLogs.reduce((acc, curr) => acc + Number(curr.points_earned || 0), 0);
    const weeklyPoints = (logs || []).reduce((acc, curr) => acc + Number(curr.points_earned || 0), 0);

    // 2. Ambil data nama people
    const userIds = Array.from(new Set((logs || []).map((l) => l.user_id)));
    const userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('people')
        .select('id, name')
        .in('id', userIds);
      if (users) {
        users.forEach((u) => {
          userMap[u.id] = u.name;
        });
      }
    }

    // 3. Leaderboard kontributor mingguan
    const userPointsMap: Record<string, number> = {};
    (logs || []).forEach((l) => {
      userPointsMap[l.user_id] = (userPointsMap[l.user_id] || 0) + Number(l.points_earned || 0);
    });

    const contributorsList = Object.entries(userPointsMap)
      .map(([userId, earned]) => ({
        userId,
        name: userMap[userId] || `Petugas (${userId.slice(0, 6)})`,
        pointsEarned: earned,
      }))
      .sort((a, b) => b.pointsEarned - a.pointsEarned);

    // Anomaly detection
    const pointValues = contributorsList.map((c) => c.pointsEarned);
    const n = pointValues.length;
    const mean = n > 0 ? pointValues.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? pointValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    const contributorsWithAnomaly = contributorsList.map((c) => {
      const anomaly = computeAnomalyScore(c.pointsEarned, mean, stdDev);
      return {
        ...c,
        isAnomaly: anomaly.isAnomaly,
        zScore: anomaly.zScore,
      };
    });

    // 4. Laporan SO terakhir & pending
    const { data: recentReports } = await supabase
      .from('reports')
      .select('id, source_report_id, status, total_points, metadata, created_at')
      .eq('app_id', 'stokis')
      .order('created_at', { ascending: false })
      .limit(10);

    const pendingAudits = (recentReports || []).filter(
      (r) => r.status === 'submitted' || r.status === 'under_review'
    ).length;

    return NextResponse.json({
      success: true,
      today,
      todayPoints,
      weeklyPoints,
      totalReports: recentReports?.length || 0,
      pendingAudits,
      contributors: contributorsWithAnomaly,
      recentReports: recentReports || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
