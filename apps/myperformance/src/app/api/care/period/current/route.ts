import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  try {
    const currentPeriod = await careRepo.getCurrentOpenPeriod();
    if (!currentPeriod) {
      return NextResponse.json({
        ok: true,
        data: {
          period: null,
          ratees: [],
          submissionStatus: 'none',
        },
      });
    }

    const { ratees, submissionStatus } = await careRepo.getRateesToAssess(
      currentPeriod.period_id,
      auth.personId
    );

    return NextResponse.json({
      ok: true,
      data: {
        period: currentPeriod,
        ratees,
        submissionStatus,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat periode aktif' },
      { status: 500 }
    );
  }
}
