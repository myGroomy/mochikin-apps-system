import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getRoleCapabilities } from '@/lib/roles';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/assessments/team
 *   - Mengambil daftar rekan kerja di cabang untuk keperluan evaluasi CARE oleh Kapten/Admin
 */
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;
  const capabilities = getRoleCapabilities(auth.role);

  if (!capabilities.canManageScorecards && !capabilities.canViewTeamInsights) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: hanya kapten atau atasan yang dapat melihat anggota tim.' },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestedBranch = searchParams.get('branch_id');
    const branchId = capabilities.canViewAllBranches && requestedBranch ? requestedBranch : auth.branchId;

    let query = supabase
      .from('people')
      .select('id, name, role, branch_id')
      .order('name');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: people, error } = await query;
    if (error) throw error;

    // Ambil status assessment bulan berjalan untuk setiap orang
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const { data: assessments } = await supabase
      .from('care_assessments')
      .select('id, person_id, period, status, note_1on1, updated_at')
      .eq('period', currentPeriod);

    const assessmentMap = new Map((assessments || []).map((a) => [a.person_id, a]));

    const members = (people || []).map((p) => {
      const a = assessmentMap.get(p.id);
      return {
        ...p,
        currentAssessmentId: a?.id ?? null,
        status: a?.status ?? 'uninitiated',
        note_1on1: a?.note_1on1 ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      period: currentPeriod,
      data: members,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Kesalahan server' },
      { status: 500 }
    );
  }
}
