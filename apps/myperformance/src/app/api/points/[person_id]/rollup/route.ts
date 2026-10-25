import { NextResponse } from 'next/server';
import { getAuthContext, UserRole } from '@/lib/auth-guard';
import { pointsService } from '@/lib/integration/points';

const PERIOD_TYPES = ['shift', 'day', 'month', 'year'] as const;
type PeriodType = (typeof PERIOD_TYPES)[number];

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

function parsePeriod(value: string | null): PeriodType {
  return PERIOD_TYPES.includes(value as PeriodType) ? (value as PeriodType) : 'day';
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

/**
 * GET /api/points/[person_id]/rollup
 *
 * Historical scores from point_rollups only (T-1+). T+0 lives in Redis and is
 * never read here.
 * Query: ?period_type=day|month|year&limit=30&offset=0
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

  const url = new URL(request.url);
  const periodType = parsePeriod(url.searchParams.get('period_type'));
  const limit = parseLimit(url.searchParams.get('limit'));
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);

  try {
    const { rows, total } = await pointsService.getRollups(targetId, periodType, limit, offset);

    return NextResponse.json({
      success: true,
      data: {
        person_id: targetId,
        period_type: periodType,
        pagination: { limit, offset, count: rows.length },
        rollups: rows,
        total: Number(total.toFixed(2)),
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
