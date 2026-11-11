import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  try {
    const period = await careRepo.getCurrentOpenPeriod();
    if (!period) {
      return NextResponse.json({ ok: false, error: 'Tidak ada periode yang sedang buka' }, { status: 400 });
    }

    await careRepo.submitEvaluation(period.period_id, auth.personId);
    return NextResponse.json({ ok: true, message: 'Penilaian berhasil dikirim (submitted)' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal mengirim penilaian' },
      { status: 400 }
    );
  }
}
