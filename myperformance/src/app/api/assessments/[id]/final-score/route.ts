import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService } from '@/lib/integration/care';

/**
 * GET /api/assessments/[id]/final-score
 *   - Compute final score per dimension = (avg_self + avg_captain) / 2
 *   - Uses setengah poin rounding: Math.round(x * 2) / 2
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
    // Check RLS: only authorized users can read
    const { getSupabaseAdmin } = require('@/lib/supabase');
    const supabase = getSupabaseAdmin();
    const { data: assessmentRow, error: assessError } = await supabase
      .from('care_assessments')
      .select('person_id, status')
      .eq('id', id)
      .single();

    if (assessError || !assessmentRow) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Assessment tidak ditemukan.' } },
        { status: 404 }
      );
    }

    // K4: Captain can only read final score after status = submitted
    const isCaptain = auth.role === 'role_captain';
    const isAuthorized =
      assessmentRow.person_id === auth.personId ||
      (isCaptain && assessmentRow.status !== 'draft') ||
      auth.role === 'role_admin' ||
      auth.role === 'role_manager' ||
      auth.role === 'super_admin';

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } },
        { status: 403 }
      );
    }

    const finalScores = await careService.computeFinalScore(id);

    return NextResponse.json({
      success: true,
      data: finalScores,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 403 }
    );
  }
}
