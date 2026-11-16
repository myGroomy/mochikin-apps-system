import { NextResponse } from 'next/server';
import { sensitiveActionSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../../../lib/api-auth';
import { verifyAdminPin } from '../../../../../../lib/admin/sensitive-action';
import { getSupabase } from '../../../../../../lib/supabase';

export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const targetUserId = new URL(req.url).pathname.split('/').at(-2) ?? '';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const parsed = sensitiveActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 });
  }

  const pinError = await verifyAdminPin(ctx.user.id, parsed.data.pin);
  if (pinError) return NextResponse.json({ error: pinError }, { status: 403 });

  const { data: updated, error } = await getSupabase()
    .from('people')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('id', targetUserId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('MyCheck account unlock failed:', error);
    return NextResponse.json({ error: 'Buka kunci akun gagal.' }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

  return NextResponse.json({ message: 'Akun berhasil dibuka kuncinya.' });
});
