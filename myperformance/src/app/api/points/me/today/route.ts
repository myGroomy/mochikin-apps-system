import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { pointsService } from '@/lib/integration/points';

/**
 * GET /api/points/me/today
 *
 * Authenticated ("milik saya") T+0 score for the caller. Person-scoped privacy is
 * enforced by the resolved JWT person_id; staff can only see their own.
 */
export async function GET(request: Request) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const score = await pointsService.getTodayScore(auth.personId);
    return NextResponse.json({
      success: true,
      data: {
        person_id: auth.personId,
        branch_id: auth.branchId,
        date: score.date,
        today_points: Number(score.points.toFixed(2)),
        source: score.source,
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
