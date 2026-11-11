import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period');

  try {
    let period = null;
    if (periodParam) {
      const periods = await careRepo.getPeriods();
      period = periods.find((p) => p.period_key === periodParam || p.period_id === periodParam) || null;
    } else {
      // Default: latest closed period
      const periods = await careRepo.getPeriods();
      period = periods.find((p) => p.status === 'closed') || null;
    }

    if (!period) {
      return NextResponse.json({
        ok: true,
        data: {
          period: null,
          isClosed: false,
          leaderboard: [],
          message: 'Belum ada periode yang telah ditutup.',
        },
      });
    }

    if (period.status !== 'closed') {
      return NextResponse.json({
        ok: true,
        data: {
          period,
          isClosed: false,
          leaderboard: [],
          message: 'Ranking dibuka setelah periode ditutup.',
        },
      });
    }

    const leaderboard = await careRepo.getLeaderboardData(period.period_id);
    return NextResponse.json({
      ok: true,
      data: {
        period,
        isClosed: true,
        leaderboard,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat leaderboard' },
      { status: 500 }
    );
  }
}
