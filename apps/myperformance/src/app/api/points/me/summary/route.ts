import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { pointsService, getDatabaseStatus } from '@/lib/integration/points';
import { effectiveHoursPerMonth, getAppTimezone, monthKeyOfIso } from '@/lib/time';

/**
 * GET /api/points/me/summary
 *
 * Authenticated ("milik saya") monthly summary: month rollup + current-month T+0.
 * Powers the M3 history / over-under target panel.
 */
export async function GET(request: Request) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const summary = await pointsService.getMonthlySummary(auth.personId);
    const monthTotal = summary.monthTotal;
    const progressPercent = summary.progressPercent;
    return NextResponse.json({
      success: true,
      dbConnected: getDatabaseStatus().connected,
      data: {
        ...summary,
        monthTotal,
        progressPercent,
        effectiveHoursPerMonth: summary.effectiveHoursPerMonth,
        estimatedEffectiveHours: Number(((monthTotal * 10) / 60).toFixed(1)),
        pointsNeededForTarget: Math.max(Number((summary.monthTarget - monthTotal).toFixed(2)), 0),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
