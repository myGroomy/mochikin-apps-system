import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  if (auth.role !== 'role_admin' && auth.role !== 'super_admin' && auth.role !== 'role_manager') {
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await careRepo.closePeriod(id);
    return NextResponse.json({ ok: true, message: 'Periode berhasil ditutup' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal menutup periode' },
      { status: 500 }
    );
  }
}
