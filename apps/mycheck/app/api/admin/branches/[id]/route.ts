import { NextResponse } from 'next/server';
import { branchSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../../lib/api-auth';
import { decidePermanentDelete } from '../../../../../lib/admin/lifecycle-policy';
import { isValidTimeZone } from '../../../../../lib/valid-timezone';
import { getSupabase } from '../../../../../lib/supabase';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function findBranch(id: string) {
  const query = getSupabase()
    .from('branches')
    .select('id,name,code,address,settings,status,created_at')
    .is('deleted_at', null);
  return isUuid(id) ? query.eq('id', id).maybeSingle() : query.eq('code', id).maybeSingle();
}

export const GET = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const id = new URL(req.url).pathname.split('/').at(-1) ?? '';
  const { data: branch, error } = await findBranch(id);
  if (error) {
    console.error('MyCheck branch lookup failed:', error);
    return NextResponse.json({ error: 'Cabang sementara tidak tersedia.' }, { status: 503 });
  }
  if (!branch) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });

  return NextResponse.json({
    branch: {
      id: branch.code,
      name: branch.name,
      code: branch.code,
      timezone: typeof branch.settings?.timezone === 'string' ? branch.settings.timezone : 'Asia/Jakarta',
      isActive: branch.status === 'active',
      address: branch.address,
      createdAt: branch.created_at,
    },
  });
});

export const PUT = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const id = new URL(req.url).pathname.split('/').at(-1) ?? '';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }
  const parsed = branchSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.timezone !== undefined && !isValidTimeZone(parsed.data.timezone)) {
    return NextResponse.json({ error: `Timezone '${parsed.data.timezone}' bukan zona waktu IANA yang valid.` }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await findBranch(id);
  if (lookupError) {
    console.error('MyCheck branch lookup failed:', lookupError);
    return NextResponse.json({ error: 'Cabang sementara tidak tersedia.' }, { status: 503 });
  }
  if (!existing) return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 404 });

  const activeInput = (body as { isActive?: unknown }).isActive;
  if (activeInput !== undefined && typeof activeInput !== 'boolean') {
    return NextResponse.json({ error: 'isActive harus berupa boolean.' }, { status: 400 });
  }
  const nextStatus = activeInput === undefined
    ? existing.status
    : activeInput ? 'active' : 'inactive';
  if (existing.status === 'active' && nextStatus !== 'active') {
    const { count, error: countError } = await getSupabase()
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null);
    if (countError) {
      console.error('MyCheck active branch count failed:', countError);
      return NextResponse.json({ error: 'Validasi cabang aktif gagal.' }, { status: 503 });
    }
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Tidak boleh menonaktifkan cabang aktif terakhir.' }, { status: 409 });
    }
  }

  const settings = { ...existing.settings };
  if (parsed.data.timezone !== undefined) settings.timezone = parsed.data.timezone;
  const updates: Record<string, unknown> = {
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
    settings,
    status: nextStatus,
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address || null;

  const { error: updateError } = await getSupabase()
    .from('branches')
    .update(updates)
    .eq('id', existing.id);
  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'Kode cabang sudah digunakan.' }, { status: 400 });
    }
    console.error('MyCheck branch update failed:', updateError);
    return NextResponse.json({ error: 'Pembaruan cabang gagal.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Cabang berhasil diperbarui' });
});

export const DELETE = withAuth(async (_req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const decision = decidePermanentDelete('branch');
  return NextResponse.json({ error: decision.message, reason: decision.reason }, { status: decision.status });
});
