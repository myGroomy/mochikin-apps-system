import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  if (auth.role !== 'role_admin' && auth.role !== 'super_admin' && auth.role !== 'role_manager') {
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period');

  try {
    let period = null;
    if (periodParam) {
      const periods = await careRepo.getPeriods();
      period = periods.find((p) => p.period_key === periodParam || p.period_id === periodParam) || null;
    } else {
      period = await careRepo.getCurrentOpenPeriod();
      if (!period) {
        const periods = await careRepo.getPeriods();
        period = periods[0] || null;
      }
    }

    if (!period) {
      return NextResponse.json({ ok: true, data: { period: null, items: [] } });
    }

    const items = await careRepo.getMonitoringData(period.period_id);
    return NextResponse.json({ ok: true, data: { period, items } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat monitoring' },
      { status: 500 }
    );
  }
}
