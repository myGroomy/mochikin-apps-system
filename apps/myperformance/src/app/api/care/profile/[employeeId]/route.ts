import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;
  const { employeeId } = await params;

  const isAdmin = auth.role === 'role_admin' || auth.role === 'super_admin' || auth.role === 'role_manager' || auth.role === 'role_captain';

  // Server-side enforcement: non-admins cannot inspect other employees' profiles
  if (!isAdmin && employeeId !== auth.personId) {
    return NextResponse.json(
      { ok: false, error: 'Akses ditolak (403): Hanya admin/atasan yang dapat melihat profil staf lain.' },
      { status: 403 }
    );
  }

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

    if (!isAdmin && period.status !== 'closed') {
      return NextResponse.json({
        ok: true,
        data: {
          period,
          isLocked: true,
          message: 'Hasil penilaian dibuka setelah periode ditutup.',
        },
      });
    }

    const profileData = await careRepo.getProfileData(employeeId, period.period_id, isAdmin);
    return NextResponse.json({ ok: true, data: profileData });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat profil' },
      { status: 500 }
    );
  }
}
