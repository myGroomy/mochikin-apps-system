import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService } from '@/lib/integration/care';

/**
 * POST /api/assessments/[id]/captain-score
 *   - Submit captain score (assessor_role = 'captain')
 *   - Status assessment harus 'draft'
 *   - Body: { captainPersonId, dimensionCode, score, observedFact, followup }
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

    const { captainPersonId, dimensionCode, score, observedFact, followup } = body;

    if (!captainPersonId || !dimensionCode || score === undefined || observedFact === undefined || followup === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'captainPersonId, dimensionCode, score, observedFact, followup wajib diisi.' } },
        { status: 400 }
      );
    }

    await careService.submitCaptainScore(id, captainPersonId, auth.personId, dimensionCode, score, observedFact, followup);

    return NextResponse.json({
      success: true,
      message: 'Skor captain berhasil dikirim.',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 403 }
    );
  }
}
