import { NextResponse } from 'next/server';
import { getAuthContext, UserRole } from '@/lib/auth-guard';
import { pointsService } from '@/lib/integration/points';

const TEAM_VIEW_ROLES: UserRole[] = [
  'role_captain',
  'role_manager',
  'role_admin',
  'super_admin',
];

function canReadPoints(authPersonId: string, authRole: UserRole, targetId: string): boolean {
  if (authPersonId === targetId) return true;
  if (authRole === 'super_admin') return true;
  return TEAM_VIEW_ROLES.includes(authRole);
}

/**
 * GET /api/points/[person_id]/today
 *
 * T+0 score from Redis only (falls back to a ledger aggregate for today when
 * Redis is unavailable). Never mixes with historical rollups.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ person_id: string }> }
) {
  const { person_id: targetPersonId } = await params;
  const auth = getAuthContext(request as never);
  const targetId = targetPersonId;

  if (!canReadPoints(auth.personId, auth.role, targetId)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak: hanya dapat melihat poin sendiri' } },
      { status: 403 }
    );
  }

  try {
    const score = await pointsService.getTodayScore(targetId);
    return NextResponse.json({
      success: true,
      data: {
        person_id: targetId,
        date: score.date,
        today_points: Number(score.points.toFixed(2)),
        source: score.source,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' },
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
