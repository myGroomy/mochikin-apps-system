
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/ito
 *   - List ITO issues for the authenticated user's branch
 *   - Query params: period (YYYY-MM), severity, status, assignee
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('ito_issues')
      .select(`
        id,
        person_id,
        branch_id,
        raised_by,
        title,
        description,
        action_item,
        assignee,
        severity,
        status,
        period_key,
        resolved_at,
        created_at,
        person:person_id (id, full_name),
        raised_by_person:raised_by (id, full_name),
        assignee_person:assignee (id, full_name)
      `)
      .eq('branch_id', auth.branchId)
      .eq('period_key', period)
      .order('created_at', { ascending: false });

    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    if (assignee) query = query.eq('assignee', assignee);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ito
 *   - Create a new ITO issue
 *   - Body: { title, description?, personId?, severity?, actionItem?, assignee? }
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) {
    return authResult.response;
  }
  const auth = authResult.auth;

  try {
    const body = await request.json().catch(() => ({}));

    const title = body.title;
    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'title wajib diisi.' } },
        { status: 400 }
      );
    }

    const personId = body.personId || auth.personId;
    const period = body.period || new Date().toISOString().slice(0, 7);
    const severity = body.severity || 'medium';
    const description = body.description || null;
    const actionItem = body.actionItem || null;
    const assignee = body.assignee || null;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ito_issues')
      .insert({
        person_id: personId,
        branch_id: auth.branchId,
        raised_by: auth.personId,
        title,
        description,
        action_item: actionItem,
        assignee,
        severity,
        status: 'baru',
        period_key: period,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { issue_id: data?.id, status: 'baru' },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err instanceof Error ? err.message : 'Gagal' } },
      { status: 500 }
    );
  }
}
