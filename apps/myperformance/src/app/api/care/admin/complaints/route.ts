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
  const periodId = searchParams.get('periodId') || undefined;

  try {
    const complaints = await careRepo.getAllComplaints(periodId);
    return NextResponse.json({ ok: true, data: complaints });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat keluhan' },
      { status: 500 }
    );
  }
}
