import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * Health check: Supabase PostgreSQL database connection.
 * Tidak butuh autentikasi — hanya melaporkan ok/error.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbStatus = 'ok';

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('branches').select('id').limit(1);
      if (error) dbStatus = 'error';
    } else {
      dbStatus = 'unconfigured';
    }
  } catch {
    dbStatus = 'error';
  }

  const healthy = dbStatus === 'ok';
  return NextResponse.json(
    {
      database: dbStatus,
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      latencyMs: Date.now() - startedAt,
    },
    { status: healthy ? 200 : 503 }
  );
}
