// app/api/cabang/[cabangId]/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { cabangId } = await params;
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const supabase = getSupabase();
  const { data, error } = isUuid(cabangId)
    ? await supabase.from('branches').select('settings').eq('id', cabangId).maybeSingle()
    : await supabase.from('branches').select('settings').eq('code', cabangId).maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  const settings = data?.settings as Record<string, unknown> | null;
  const urutanLaporan = (settings?.urutanLaporan as string) || 'kategori';

  return NextResponse.json({ success: true, data: { urutanLaporan } });
});

export const PUT = withAuth(async (req: NextRequest, { params }, session) => {
  const { cabangId } = await params;
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const value = String(body?.urutanLaporan || '');

  const supabase = getSupabase();
  const { data: branch, error: fetchError } = isUuid(cabangId)
    ? await supabase.from('branches').select('settings').eq('id', cabangId).maybeSingle()
    : await supabase.from('branches').select('settings').eq('code', cabangId).maybeSingle();

  if (fetchError) {
    return NextResponse.json({ success: false, error: { message: fetchError.message } }, { status: 400 });
  }

  const currentSettings = branch?.settings && typeof branch.settings === 'object' ? branch.settings : {};
  const settings = { ...currentSettings, urutanLaporan: value };

  const updateQuery = supabase.from('branches').update({ settings });
  const { error } = isUuid(cabangId)
    ? await updateQuery.eq('id', cabangId)
    : await updateQuery.eq('code', cabangId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { urutanLaporan: value } });
}, { requiredRole: 'admin' });