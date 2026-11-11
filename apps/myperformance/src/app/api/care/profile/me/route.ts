import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period');

  try {
    let period = null;
    if (periodParam) {
      const periods = await careRepo.getPeriods();
      period = periods.find((p) => p.period_key === periodParam || p.period_id === periodParam) || null;
    } else {
      const periods = await careRepo.getPeriods();
      period = periods.find((p) => p.status === 'closed') || periods[0] || null;
    }

    if (!period) {
      return NextResponse.json({ ok: false, error: 'Periode tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = auth.role === 'role_admin' || auth.role === 'super_admin' || auth.role === 'role_manager';

    // Staff can only view results after period is closed
    if (!isAdmin && period.status !== 'closed') {
      return NextResponse.json({
        ok: true,
        data: {
          period,
          isLocked: true,
          message: 'Hasil penilaian dibuka setelah periode ditutup dan dibahas di sesi 1:1.',
        },
      });
    }

    const profileData = await careRepo.getProfileData(auth.personId, period.period_id, false);
    return NextResponse.json({ ok: true, data: profileData });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat profil' },
      { status: 500 }
    );
  }
}
