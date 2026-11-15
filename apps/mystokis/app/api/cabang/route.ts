// app/api/cabang/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const GET = withAuth(async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, code, address, phone, status')
    .order('name');

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  const list = (data || []).map((b: { code: string; name: string; address?: string | null; phone?: string | null; status?: string }) => ({
    Cabang_ID: b.code,
    Nama_Cabang: b.name,
    Alamat: b.address || '',
    Nomor_WA_Cabang: b.phone || '',
    Aktif: b.status === 'active',
  }));

  return NextResponse.json({ success: true, data: list });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  if (!body?.Nama_Cabang) {
    return NextResponse.json({ success: false, error: { message: 'Nama_Cabang wajib diisi' } }, { status: 400 });
  }

  const code = body.Cabang_ID || body.Nama_Cabang.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 16);
  const supabase = getSupabase();

  const { error } = await supabase.from('branches').insert({
    name: body.Nama_Cabang,
    code,
    address: body.Alamat,
    phone: body.Nomor_WA_Cabang,
    status: 'active',
  });

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { cabangId: code } }, { status: 201 });
}, { requiredRole: 'admin' });
