// app/api/petugas/[petugasId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { petugasId } = await params;
  const body = await req.json();
  const supabase = getSupabase();

  let targetId = isUuid(petugasId) ? petugasId : null;
  if (!targetId) {
    const { data: p } = await supabase.from('people').select('id').ilike('username', petugasId).maybeSingle();
    if (p?.id) targetId = p.id;
  }

  if (!targetId) {
    return NextResponse.json({ success: false, error: { message: 'Petugas tidak ditemukan' } }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.Nama_Petugas !== undefined) {
    updateData.name = body.Nama_Petugas;
  } else if (body.nama !== undefined) {
    updateData.name = body.nama;
  }

  if (body.Role !== undefined) {
    updateData.role = body.Role;
  } else if (body.role !== undefined) {
    updateData.role = body.role;
  }

  const { error } = await supabase
    .from('people')
    .update(updateData)
    .eq('id', targetId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { petugasId: targetId } }, { status: 200 });
}, { requiredRole: 'admin' });
