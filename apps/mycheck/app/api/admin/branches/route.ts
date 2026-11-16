import { NextResponse } from 'next/server';
import { branchSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import { isValidTimeZone } from '../../../../lib/valid-timezone';
import { getSupabase } from '../../../../lib/supabase';

export const GET = withAuth(async (_req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const { data: branches, error } = await getSupabase()
    .from('branches')
    .select('id,name,code,address,settings,status,created_at')
    .is('deleted_at', null)
    .order('code');
  if (error) {
    console.error('MyCheck branch list failed:', error);
    return NextResponse.json({ error: 'Daftar cabang sementara tidak tersedia.' }, { status: 503 });
  }

  return NextResponse.json({
    branches: (branches ?? []).map((branch) => ({
      id: branch.code,
      name: branch.name,
      code: branch.code,
      timezone: typeof branch.settings?.timezone === 'string' ? branch.settings.timezone : 'Asia/Jakarta',
      isActive: branch.status === 'active',
      address: branch.address,
      createdAt: branch.created_at,
    })),
  });
});

export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, code, timezone, address, isActive } = parsed.data;
  if (!isValidTimeZone(timezone)) {
    return NextResponse.json(
      { error: `Timezone '${timezone}' bukan zona waktu IANA yang valid.` },
      { status: 400 }
    );
  }

  const { data: branch, error } = await getSupabase()
    .from('branches')
    .insert({
      name,
      code,
      city: '',
      address: address?.trim() || null,
      settings: { timezone },
      status: isActive === false ? 'inactive' : 'active',
      created_by: ctx.user.id,
    })
    .select('id,name,code,address,settings,status,created_at')
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Kode cabang '${code}' sudah digunakan.` }, { status: 400 });
    }
    console.error('MyCheck branch creation failed:', error);
    return NextResponse.json({ error: 'Pembuatan cabang gagal.' }, { status: 500 });
  }

  return NextResponse.json({
    branch: {
      id: branch.code,
      name: branch.name,
      code: branch.code,
      timezone,
      isActive: branch.status === 'active',
      address: branch.address,
      createdAt: branch.created_at,
    },
  }, { status: 201 });
});
