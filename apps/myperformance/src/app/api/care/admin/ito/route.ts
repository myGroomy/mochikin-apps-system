import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;

  try {
    const issues = await careRepo.getItoIssues();
    return NextResponse.json({ ok: true, data: issues });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat isu ITO' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  if (auth.role !== 'role_admin' && auth.role !== 'super_admin' && auth.role !== 'role_manager') {
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { itoId, priority, solution, status } = body;
    if (!itoId) return NextResponse.json({ ok: false, error: 'itoId wajib diisi' }, { status: 400 });

    await careRepo.updateItoIssue(itoId, { priority, solution, status });
    return NextResponse.json({ ok: true, message: 'Isu ITO berhasil diperbarui' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal update isu ITO' },
      { status: 500 }
    );
  }
}
