import { NextResponse } from 'next/server';
import { getAuthContext, UserRole } from '@/lib/auth-guard';
import { pointsService, getDatabaseStatus } from '@/lib/integration/points';
import { effectiveHoursPerMonth, monthKeyOfIso, getAppTimezone } from '@/lib/time';

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
 * GET /api/points/[person_id]/summary
 *
 * M3: monthly summary combining month rollups + T+0 today (current month only).
 * Used by the "history & target" panel.
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
      { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } },
      { status: 403 }
    );
  }

  try {
    const summary = await pointsService.getMonthlySummary(targetId);
    const effectiveHoursPerMonthValue = effectiveHoursPerMonth();
    const monthTotal = summary.monthTotal;
    const progressPercent = summary.progressPercent;
    return NextResponse.json({
      success: true,
      dbConnected: getDatabaseStatus().connected,
      data: {
        ...summary,
        monthTotal: monthTotal,
        progressPercent,
        effectiveHoursPerMonth: effectiveHoursPerMonthValue,
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
