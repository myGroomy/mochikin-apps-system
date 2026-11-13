import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAppTimezone } from '@/lib/time';

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;
  return false;
}

/**
 * GET /api/cron/keepalive
 *
 * Prevents Supabase Free Tier project pause (~7 days inactivity threshold).
 * Executes lightweight keepalive ping and returns database health & WIB timestamp.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Cron secret tidak valid' } },
      { status: 401 }
    );
  }

  const start = Date.now();
  const supabase = getSupabaseAdmin() as any;

  try {
    const { data, error } = await supabase.from('point_config').select('config_key').limit(1);
    if (error) throw error;

    const latencyMs = Date.now() - start;
    const nowWib = new Intl.DateTimeFormat('id-ID', {
      timeZone: getAppTimezone(),
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(new Date());

    return NextResponse.json({
      success: true,
      status: 'active',
      database: 'connected',
      latency_ms: latencyMs,
      timestamp_wib: nowWib,
      timestamp_iso: new Date().toISOString(),
      message: 'Supabase keepalive ping successful. Project activity refreshed.',
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Keepalive query failed',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
