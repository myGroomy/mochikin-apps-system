
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * PUT /api/ito/[id]/status
 *   - Update issue status (baru → diskusi → selesai)
 *   - Body: { status }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const status = body.status;
    if (!status || !['baru', 'diskusi', 'selesai'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Status tidak valid. Gunakan: baru, diskusi, selesai.' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check issue exists and belongs to branch
    const { data: issue } = await supabase
      .from('ito_issues')
      .select('id, branch_id, status')
      .eq('id', id)
      .single();

    if (!issue) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan.' } },
        { status: 404 }
      );
    }

    if (issue.branch_id !== auth.branchId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } },
        { status: 403 }
      );
    }

    const resolvedAt = status === 'selesai' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('ito_issues')
      .update({
        status,
        resolved_at: resolvedAt,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id, status } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}
