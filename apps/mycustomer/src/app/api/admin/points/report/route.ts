import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/supabase'
import { aggregatePointLedgerRows } from '@/lib/pointLedgerReport'
import { computeAnomalyScore } from '@mochikin/shared'

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
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getTodayJakarta();
    const branchRef = searchParams.get('branch_id');

    const supabase = getSupabase();
    let branchId: string | undefined;
    if (branchRef) {
      const branchQuery = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchRef)
        ? supabase.from('branches').select('id').eq('id', branchRef)
        : supabase.from('branches').select('id').eq('code', branchRef);
      const { data: branch, error } = await branchQuery.maybeSingle();
      if (error) throw error;
      if (!branch) return NextResponse.json({ success: false, error: 'Cabang tidak ditemukan' }, { status: 404 });
      branchId = branch.id;
    }

    let query = supabase
      .from('point_ledger')
      .select('id, person_id, branch_id, task_code, task_name_snapshot, source_app, points, occurred_at, shift_date, meta')
      .eq('source_app', 'mycustomer')
      .eq('task_code', 'MYCUST_WA')
      .eq('shift_date', date)
      .order('occurred_at', { ascending: false });

    if (branchId) query = query.eq('branch_id', branchId);
    const { data: rows, error: rowsError } = await query;
    if (rowsError) throw rowsError;
    const ledgerRows = rows || [];

    const userIds = Array.from(new Set(ledgerRows.map((row) => row.person_id)));
    const userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users, error } = await supabase
        .from('people')
        .select('id, name')
        .in('id', userIds);
      if (error) throw error;
      users?.forEach((user) => { userMap[user.id] = user.name; });
    }

    const { earnedRows, reversalPoints, totalPoints, userPointsMap } = aggregatePointLedgerRows(ledgerRows);
    ledgerRows.forEach((row) => {
      if (!userMap[row.person_id] && typeof row.meta?.user_name === 'string') {
        userMap[row.person_id] = row.meta.user_name;
      }
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

    let waQuery = supabase
      .from('mycustomer_wa_logs')
      .select('id', { count: 'exact', head: true })
      .eq('locked_until', date);
    if (branchId) {
      const { data: branchPeople, error } = await supabase
        .from('people')
        .select('id')
        .eq('branch_id', branchId);
      if (error) throw error;
      const branchPeopleIds = branchPeople?.map((person) => person.id) || [];
      if (branchPeopleIds.length === 0) {
        return NextResponse.json({
          success: true, date, totalFollowUps: 0, totalPoints,
          contributors: contributorsWithAnomaly, logs: [],
        });
      }
      waQuery = waQuery.in('user_id', branchPeopleIds);
    }
    const { count: waCount, error: waError } = await waQuery;
    if (waError) throw waError;

    return NextResponse.json({
      success: true,
      date,
      totalFollowUps: waCount || 0,
      totalPoints,
      contributors: contributorsWithAnomaly,
      logs: earnedRows.map((row) => {
        const pointsOriginal = Number(row.points || 0);
        const pointsEarned = pointsOriginal + (reversalPoints.get(row.id) || 0);
        return {
          id: row.id,
          userId: row.person_id,
          userName: userMap[row.person_id] || `User (${row.person_id.slice(0, 6)})`,
          activityType: row.task_name_snapshot,
          pointsEarned,
          pointsOriginal,
          isZeroed: pointsEarned === 0 && pointsOriginal > 0,
          createdAt: row.occurred_at,
          metadata: row.meta || {},
        };
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
