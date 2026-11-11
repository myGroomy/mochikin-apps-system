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
    const body = await request.json().catch(() => ({}));
    const priority = body.priority || 'Sedang';

    const itoId = await careRepo.convertComplaintToIto(id, priority);
    return NextResponse.json({ ok: true, data: { itoId }, message: 'Keluhan berhasil dijadikan Isu ITO' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal konversi ke ITO' },
      { status: 400 }
    );
  }
}
