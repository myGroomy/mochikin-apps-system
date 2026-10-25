import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careService, CARE_DIMENSIONS } from '@/lib/integration/care';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/assessments
 *   - Membuat assessment baru (status draft)
 *   - Body: { personId?, period?, captainPersonId?, branchId? }
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const body = await request.json().catch(() => ({}));

    const personId = body.personId || auth.personId;
    const period = body.period || new Date().toISOString().slice(0, 7);
    const captainPersonId = body.captainPersonId || personId;
    const branchId = body.branchId || auth.branchId;

    if (!personId || !period) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'personId dan period wajib diisi.' } },
        { status: 400 }
      );
    }

    // Check person exists
    const supabase = getSupabaseAdmin();
    const { data: existingPerson } = await supabase
      .from('people')
      .select('id')
      .eq('id', personId)
      .single();

    if (!existingPerson) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Person tidak ditemukan.' } },
        { status: 404 }
      );
    }

    const assessmentId = await careService.createAssessment({
      personId,
      period,
      captainPersonId,
      branchId,
    });

    return NextResponse.json({
      success: true,
      data: { assessment_id: assessmentId, status: 'draft' },
      assessment_id: assessmentId,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessments
 *   - List assessments for authenticated person
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const assessments = await careService.getAssessmentsByPerson(auth.personId, auth.role);

    return NextResponse.json({
      success: true,
      data: assessments,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}
