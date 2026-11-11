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

  try {
    const periods = await careRepo.getPeriods();
    return NextResponse.json({ ok: true, data: periods });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat periode' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  if (auth.role !== 'role_admin' && auth.role !== 'super_admin' && auth.role !== 'role_manager') {
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { periodKey, label, participants } = body;
    if (!periodKey || !label) {
      return NextResponse.json({ ok: false, error: 'periodKey dan label wajib diisi' }, { status: 400 });
    }

    const newPeriod = await careRepo.createPeriod(periodKey, label, participants || []);
    return NextResponse.json({ ok: true, data: newPeriod });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal membuat periode' },
      { status: 500 }
    );
  }
}
