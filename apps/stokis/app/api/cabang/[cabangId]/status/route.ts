// app/api/cabang/[cabangId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { cabangId } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabase();

  const status = body?.aktif ? 'active' : 'inactive';
  const query = supabase.from('branches').update({ status });
  const { error } = isUuid(cabangId)
    ? await query.eq('id', cabangId)
    : await query.eq('code', cabangId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { cabangId, aktif: !!body?.aktif } });
}, { requiredRole: 'admin' });
