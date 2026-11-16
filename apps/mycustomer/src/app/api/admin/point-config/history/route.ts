import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '@/lib/apiAuth';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const supabase = getSupabase();

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
