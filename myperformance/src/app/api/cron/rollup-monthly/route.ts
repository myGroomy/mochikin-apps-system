import { NextResponse } from 'next/server';
import { pointsService } from '@/lib/integration/points';
import { getAppTimezone, monthKeyOfIso } from '@/lib/time';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get('secret') === CRON_SECRET) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

function isValidMonth(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const [y, m] = value.split('-').map(Number);
  return m >= 1 && m <= 12;
}

/**
 * GET /api/cron/rollup-monthly
 *
 * Runs on the 1st of each month (Vercel Cron: 0 1 1 * *).
 * Aggregates the month-to-date (or a requested month) from point_ledger into
 * a single point_rollups row with period_type='month'.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Cron secret tidak valid' } },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const rawMonth = url.searchParams.get('month');
  const month = rawMonth && isValidMonth(rawMonth) ? rawMonth : monthKeyOfIso(new Date().toISOString(), getAppTimezone());

  try {
    const processed = await pointsService.persistMonthRollups(month);
    return NextResponse.json({
      success: true,
      data: { month, processed_persons: processed },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Rollup bulanan gagal' },
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
