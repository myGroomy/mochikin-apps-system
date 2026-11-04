import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../../lib/api-auth';
import { getSupabase } from '@/lib/supabase';

export const GET = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const url = new URL(req.url);
  const appId = url.searchParams.get('appId') || 'mycheck';
  const entityType = url.searchParams.get('entityType');
  const entityRef = url.searchParams.get('entityRef');

  if (!entityRef) {
    return NextResponse.json({ error: 'entityRef wajib diisi' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database Supabase tidak terhubung' }, { status: 500 });
  }

  let query = supabase
    .from('point_master_changes')
    .select('*')
    .eq('app_id', appId)
    .eq('entity_ref', entityRef)
    .order('changed_at', { ascending: false })
    .limit(50);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ changes: data || [] });
});
