import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService } from '@/lib/integration/care';

/**
 * POST /api/assessments/[id]/finalize
 *   - Status: discussed → final
 *   - Final = (avg_self + avg_captain) / 2 per dimension (setengah poin rounding)
 *   - Body: { personId? } (default: authenticated user)
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

    const personId = body.personId || auth.personId;

    await careService.finalizeAssessment(id, personId);

    return NextResponse.json({
      success: true,
      message: 'Assessment berhasil difinalisasi (status: final).',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 403 }
    );
  }
}
