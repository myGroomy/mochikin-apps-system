import { NextRequest, NextResponse } from 'next/server';
import { computeAnomalyScore } from '@mochikin/shared';
import { getSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const supabase = getSupabase();
    const today = getTodayJakarta();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [eventsResult, reportsResult, reportCountResult, pendingCountResult] = await Promise.all([
      supabase
        .from('point_event')
        .select('person_id, points, shift_date')
        .eq('app_id', 'stokis')
        .gte('shift_date', sevenDaysAgo)
        .order('shift_date', { ascending: false }),
      supabase
        .from('app_reports')
        .select('id, source_ref, status, total_points, metadata, created_at')
        .eq('app_id', 'stokis')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('app_reports')
        .select('id', { count: 'exact', head: true })
        .eq('app_id', 'stokis'),
      supabase
        .from('app_reports')
        .select('id', { count: 'exact', head: true })
        .eq('app_id', 'stokis')
        .in('status', ['submitted', 'under_review']),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (reportsResult.error) throw reportsResult.error;
    if (reportCountResult.error) throw reportCountResult.error;
    if (pendingCountResult.error) throw pendingCountResult.error;

    const events = eventsResult.data || [];
    const todayPoints = events
      .filter((event) => event.shift_date === today)
      .reduce((total, event) => total + Number(event.points), 0);
    const weeklyPoints = events.reduce((total, event) => total + Number(event.points), 0);
    const pointTotals = new Map<string, number>();
    for (const event of events) {
      pointTotals.set(event.person_id, (pointTotals.get(event.person_id) || 0) + Number(event.points));
    }

    const personIds = Array.from(pointTotals.keys());
    const { data: people, error: peopleError } = personIds.length
      ? await supabase.from('people').select('id, name').in('id', personIds)
      : { data: [], error: null };
    if (peopleError) throw peopleError;
    const personNames = new Map((people || []).map((person) => [person.id, person.name]));
    const contributors = Array.from(pointTotals, ([userId, pointsEarned]) => ({
      userId,
      name: personNames.get(userId) || `Petugas (${userId.slice(0, 6)})`,
      pointsEarned,
    })).sort((a, b) => b.pointsEarned - a.pointsEarned);

    const values = contributors.map((contributor) => contributor.pointsEarned);
    const mean = values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
    const variance = values.length > 1
      ? values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / (values.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const contributorsWithAnomaly = contributors.map((contributor) => {
      const anomaly = computeAnomalyScore(contributor.pointsEarned, mean, stdDev);
      return { ...contributor, isAnomaly: anomaly.isAnomaly, zScore: anomaly.zScore };
    });

    const recentReports = reportsResult.data || [];
    return NextResponse.json({
      success: true,
      today,
      todayPoints,
      weeklyPoints,
      totalReports: reportCountResult.count || 0,
      pendingAudits: pendingCountResult.count || 0,
      contributors: contributorsWithAnomaly,
      recentReports,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}, { requiredRole: 'admin' });
