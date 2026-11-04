import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from '@/lib/apiAuth';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    const branchId = req.nextUrl.searchParams.get('branch_id');

    let query = supabase
      .from('point_master_changes')
      .select('*')
      .eq('app_id', 'mycustomer')
      .order('changed_at', { ascending: false })
      .limit(50);

    if (branchId) {
      query = query.eq('entity_ref', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, changes: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
