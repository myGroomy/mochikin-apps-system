import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateReportContributors, computeAnomalyScore } from '@mochikin/shared';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

function isConnectionOrTableError(msg: string): boolean {
  const m = msg.toLowerCase();
  return /schema cache|could not find the table|pgrst205|econnrefused|failed to fetch|network error|connection timeout/.test(m);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getTodayJakarta();
    const branchId = searchParams.get('branch_id');

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        date,
        totalFollowUps: 0,
        totalPoints: 0,
        contributors: [],
        logs: [],
        message: 'Database tidak terhubung (demo mode)',
      });
    }

    let dbConnected = true;

    // 1. Ambil point_logs untuk app 'mycustomer' pada tanggal tsb
    let query = supabase
      .from('point_logs')
      .select('id, user_id, branch_id, activity_type, points_earned, points_original, created_at, metadata')
      .eq('app_id', 'mycustomer')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    let logs: any[] = [];
    let logsErr: any = null;
    try {
      const res = await query;
      logs = (res.data as any[]) || [];
      logsErr = res.error;
    } catch (err) {
      logsErr = err;
    }
    if (logsErr) {
      const msg = logsErr instanceof Error ? logsErr.message : String(logsErr);
      if (isConnectionOrTableError(msg)) {
        dbConnected = false;
        logs = [];
      } else {
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
      }
    }

    // 2. Ambil data people (users) untuk nama
    const userIds = Array.from(new Set((logs || []).map((l) => l.user_id)));
    let userMap: Record<string, string> = {};
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

    // 3. Hitung kontribusi per user
    const totalPoints = (logs || []).reduce((acc, curr) => acc + Number(curr.points_earned || 0), 0);
    const userPointsMap: Record<string, number> = {};
    (logs || []).forEach((l) => {
      userPointsMap[l.user_id] = (userPointsMap[l.user_id] || 0) + Number(l.points_earned || 0);
    });

    const contributorsList = Object.entries(userPointsMap).map(([userId, earned]) => ({
      userId,
      name: userMap[userId] || `User (${userId.slice(0, 6)})`,
      pointsEarned: earned,
      sharePercent: totalPoints > 0 ? (earned / totalPoints) * 100 : 0,
    }));

    // Hitung anomali jika ada lebih dari 1 contributor
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

    // 4. Hitung total WA unik dikirim hari ini
    let waCount = 0;
    try {
      const { count } = await supabase
        .from('mycustomer_wa_logs')
        .select('id', { count: 'exact' })
        .eq('locked_until', date);
      waCount = count || 0;
    } catch {
      dbConnected = false;
    }

    return NextResponse.json({
      success: true,
      dbConnected,
      date,
      totalFollowUps: waCount || logs?.length || 0,
      totalPoints,
      contributors: contributorsWithAnomaly,
      logs: (logs || []).map((l) => ({
        id: l.id,
        userId: l.user_id,
        userName: userMap[l.user_id] || `User (${l.user_id.slice(0, 6)})`,
        activityType: l.activity_type,
        pointsEarned: Number(l.points_earned),
        pointsOriginal: Number(l.points_original),
        isZeroed: Number(l.points_earned) === 0 && Number(l.points_original) > 0,
        createdAt: l.created_at,
        metadata: l.metadata,
      })),
      ...(dbConnected ? {} : { message: 'Database tidak terhubung. Tampilan dalam mode normal (kosong/nol).' }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
