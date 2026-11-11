import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rateeId: string }> }
) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;
  const { rateeId } = await params;

  try {
    const period = await careRepo.getCurrentOpenPeriod();
    if (!period) {
      return NextResponse.json({ ok: false, error: 'Tidak ada periode yang sedang buka' }, { status: 400 });
    }

    const scores = await careRepo.getDraftEvaluation(period.period_id, auth.personId, rateeId);
    return NextResponse.json({ ok: true, data: scores });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat draf penilaian' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ rateeId: string }> }
) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;
  const { rateeId } = await params;

  if (rateeId === auth.personId) {
    return NextResponse.json({ ok: false, error: 'Tidak dapat menilai diri sendiri' }, { status: 400 });
  }

  try {
    const period = await careRepo.getCurrentOpenPeriod();
    if (!period) {
      return NextResponse.json({ ok: false, error: 'Tidak ada periode yang sedang buka' }, { status: 400 });
    }

    const body = await request.json();
    const scores = body.scores || []; // Array<{ dimensionId, score, note }>

    await careRepo.saveDraftEvaluation(period.period_id, auth.personId, rateeId, scores);
    return NextResponse.json({ ok: true, message: 'Draf berhasil disimpan' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan draf' },
      { status: 500 }
    );
  }
}
