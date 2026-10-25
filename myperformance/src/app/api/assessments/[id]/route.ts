import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService } from '@/lib/integration/care';

/**
 * GET /api/assessments/[id]
 *   - Get single assessment detail
 */
export async function GET(
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
    const detail = await careService.getAssessment(id, auth.personId, auth.role);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Assessment tidak ditemukan.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 403 }
    );
  }
}
