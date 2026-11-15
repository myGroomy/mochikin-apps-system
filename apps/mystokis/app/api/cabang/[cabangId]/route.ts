// app/api/cabang/[cabangId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { cabangId } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabase();

  const updateData = {
    name: body.Nama_Cabang,
    address: body.Alamat,
    phone: body.Nomor_WA_Cabang,
  };

  const query = supabase.from('branches').update(updateData);
  const { error } = isUuid(cabangId)
    ? await query.eq('id', cabangId)
    : await query.eq('code', cabangId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { cabangId } });
}, { requiredRole: 'admin' });
