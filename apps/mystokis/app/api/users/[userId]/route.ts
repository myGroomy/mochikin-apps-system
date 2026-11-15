// app/api/users/[userId]/route.ts
import { scryptSync, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}$${hash}`;
}

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { userId } = await params;
  const body = await req.json();
  const supabase = getSupabase();

  let targetId = isUuid(userId) ? userId : null;
  if (!targetId) {
    const { data: p } = await supabase.from('people').select('id').ilike('username', userId).maybeSingle();
    if (p?.id) targetId = p.id;
  }

  if (!targetId) {
    return NextResponse.json({ success: false, error: { message: 'User tidak ditemukan' } }, { status: 404 });
  }

  // Toggle status aktif (send live only `{ aktif }`)
  if (Object.prototype.hasOwnProperty.call(body, 'aktif') && Object.keys(body).length === 1) {
    const isAktif = body.aktif === true || body.aktif === 'true' || body.aktif === 'TRUE';
    const status = isAktif ? 'active' : 'inactive';

    const { error } = await supabase
      .from('people')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { userId: targetId, aktif: isAktif } }, { status: 200 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.nama !== undefined) updateData.name = body.nama;
  else if (body.name !== undefined) updateData.name = body.name;

  if (body.username !== undefined) updateData.username = String(body.username).trim() || null;
  if (body.role !== undefined) updateData.role = body.role;
  else if (body.Role !== undefined) updateData.role = body.Role;

  if (body.pin) updateData.pin_hash = hashPin(String(body.pin).trim());

  if (body.cabangId !== undefined) {
    const tokens = String(body.cabangId)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const branchIds: string[] = [];
    for (const t of tokens) {
      const query = supabase.from('branches').select('id');
      const { data: b } = isUuid(t)
        ? await query.eq('id', t).maybeSingle()
        : await query.ilike('code', t).maybeSingle();
      if (b?.id && !branchIds.includes(b.id)) {
        branchIds.push(b.id);
      }
    }

    if (branchIds.length > 0) {
      updateData.branch_id = branchIds[0];
      await supabase.from('branch_members').delete().eq('person_id', targetId);
      for (const bId of branchIds) {
        await supabase.from('branch_members').insert({
          person_id: targetId,
          branch_id: bId,
          is_active: true,
        });
      }
    }
  }

  const { error } = await supabase
    .from('people')
    .update(updateData)
    .eq('id', targetId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { userId: targetId } }, { status: 200 });
}, { requiredRole: 'admin' });

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { userId } = await params;
  const supabase = getSupabase();

  let targetId = isUuid(userId) ? userId : null;
  if (!targetId) {
    const { data: p } = await supabase.from('people').select('id').ilike('username', userId).maybeSingle();
    if (p?.id) targetId = p.id;
  }

  if (!targetId) {
    return NextResponse.json({ success: false, error: { message: 'User tidak ditemukan' } }, { status: 404 });
  }

  const { error } = await supabase
    .from('people')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { userId: targetId } }, { status: 200 });
}, { requiredRole: 'admin' });
