
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * PUT /api/ito/[id]
 *   - Update issue detail
 *   - Body: { title?, description?, actionItem?, assignee?, severity? }
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

    const supabase = getSupabaseAdmin();

    // Check issue exists and belongs to branch
    const { data: issue } = await supabase
      .from('ito_issues')
      .select('id, branch_id')
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

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.actionItem !== undefined) updates.action_item = body.actionItem;
    if (body.assignee !== undefined) updates.assignee = body.assignee;
    if (body.severity !== undefined) updates.severity = body.severity;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Tidak ada field yang diupdate.' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ito_issues')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}
