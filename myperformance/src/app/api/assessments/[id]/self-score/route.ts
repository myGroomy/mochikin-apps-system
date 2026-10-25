import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService } from '@/lib/integration/care';

/**
 * POST /api/assessments/[id]/self-score
 *   - Submit self-score (assessor_role = 'self')
 *   - Status assessment harus 'draft'
 *   - Body: { dimensionCode, score, observedFact }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'ID assessment wajib diisi.' } },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const { dimensionCode, score, observedFact } = body;

    if (!dimensionCode || score === undefined || observedFact === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'dimensionCode, score, observedFact wajib diisi.' } },
        { status: 400 }
      );
    }

    await careService.submitSelfScore(id, auth.personId, dimensionCode, score, observedFact);

    return NextResponse.json({
      success: true,
      message: 'Skor self berhasil dikirim.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 403 }
    );
  }
}
