import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const GET = withAuth(async (_req: NextRequest, context, session) => {
  try {
    const { cabang } = await context.params;
    const accessError = assertCabangAccess(session, cabang);
    if (accessError) return accessError;

    const supabase = getSupabase();
    let query = supabase.from('stokis_opnames').select('opname_date');
    query = isUuid(cabang)
      ? query.or(`branch_id.eq.${cabang},branch_code.eq.${cabang}`)
      : query.eq('branch_code', cabang);

    const { data, error } = await query.order('opname_date', { ascending: false });
    if (error) {
      return NextResponse.json({ success: false, error: { code: 'FETCH_DATES_ERROR', message: error.message } }, { status: 500 });
    }

    const dates = Array.from(new Set((data || []).map((r) => r.opname_date).filter(Boolean)));
    return NextResponse.json({ success: true, data: { dates } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat tanggal';
    return NextResponse.json({ success: false, error: { code: 'FETCH_DATES_ERROR', message } }, { status: 500 });
  }
});
