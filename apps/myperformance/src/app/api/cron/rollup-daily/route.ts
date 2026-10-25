import { NextResponse } from 'next/server';
import { pointsService } from '@/lib/integration/points';
import { previousBusinessDate, getAppTimezone } from '@/lib/time';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get('secret') === CRON_SECRET) return true;
  // Non-production convenience for local testing.
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * GET /api/cron/rollup-daily
 *
 * Vercel Cron at 00:00 daily.
 * 1. Verify CRON_SECRET.
 * 2. Resolve target date (default: previous business day in APP_TIMEZONE).
 * 3. Aggregate point_ledger for the day.
 * 4. UPSERT point_rollups (period_type='day').
 * 5. Clear Redis T+0 counters now that history is durable.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Cron secret tidak valid' } },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const rawDate = url.searchParams.get('date');
  const targetDate =
    rawDate && isValidDate(rawDate) ? rawDate : previousBusinessDate(getAppTimezone());

  try {
    const processed = await pointsService.persistDayRollups(targetDate);
    return NextResponse.json({
      success: true,
      data: { date: targetDate, processed_persons: processed },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Rollup harian gagal' },
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
