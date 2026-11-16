import { NextResponse } from 'next/server';
import { updateUserSchema, sensitiveActionSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../../lib/api-auth';
import { decidePermanentDelete } from '../../../../../lib/admin/lifecycle-policy';
import { verifyAdminPin, countActiveAdmins } from '../../../../../lib/admin/sensitive-action';
import { getSupabase } from '../../../../../lib/supabase';

const isAdminRole = (role: string) => ['admin', 'role_admin', 'super_admin'].includes(role);

export const PUT = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const targetUserId = new URL(req.url).pathname.split('/').at(-1) ?? '';
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await getSupabase()
    .from('people')
    .select('id,name,role,status,branch_members(branch_id,is_active,branches(code))')
    .eq('id', targetUserId)
    .is('deleted_at', null)
    .maybeSingle();
  if (existingError) {
    console.error('MyCheck user lookup failed:', existingError);
    return NextResponse.json({ error: 'Pengguna sementara tidak tersedia.' }, { status: 503 });
  }
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

  const { name, role, branchIds, isActive } = parsed.data;
  const isSensitiveChange = role !== undefined || isActive !== undefined || branchIds !== undefined;
  const sensitive = sensitiveActionSchema.safeParse(body);
  if (isSensitiveChange && !sensitive.success) {
    return NextResponse.json(
      {
        error: 'Ubah peran/nonaktifkan akun wajib menyertakan alasan dan PIN konfirmasi admin',
        details: sensitive.error.flatten(),
      },
      { status: 400 }
    );
  }
  if (isSensitiveChange && sensitive.success) {
    const pinErr = await verifyAdminPin(ctx.user.id, String(sensitive.data.pin ?? ''));
    if (pinErr) return NextResponse.json({ error: pinErr }, { status: 403 });
  }

  const currentRole = isAdminRole(existing.role) ? 'admin' : 'petugas';
  const nextRole = role ?? currentRole;
  const nextStatus = isActive === undefined ? existing.status : isActive ? 'active' : 'inactive';
  const currentMemberships = (existing.branch_members ?? []).map((membership) => membership.branch_id);
  const requestedCodes = nextRole === 'admin'
    ? []
    : branchIds ?? (existing.branch_members ?? []).map((membership) => {
          const branch = Array.isArray(membership.branches) ? membership.branches[0] : membership.branches;
          return branch?.code ?? '';
        })
        .filter(Boolean);

  if (nextRole !== 'admin' && requestedCodes.length === 0) {
    return NextResponse.json({ error: 'Petugas harus ditugaskan ke minimal satu cabang.' }, { status: 400 });
  }

  if (currentRole === 'admin' && (nextRole !== 'admin' || nextStatus !== 'active')) {
    if ((await countActiveAdmins(targetUserId)) < 1) {
      return NextResponse.json(
        { error: 'Operasi ditolak. Sistem harus memiliki setidaknya 1 admin aktif.' },
        { status: 400 }
      );
    }
  }

  let branchUUIDs = currentMemberships;
  if (nextRole !== 'admin' && branchIds !== undefined) {
    const { data: branches, error: branchesError } = await getSupabase()
      .from('branches')
      .select('id,code')
      .in('code', [...new Set(requestedCodes)])
      .eq('status', 'active')
      .is('deleted_at', null);
    if (branchesError) {
      console.error('MyCheck branch validation failed:', branchesError);
      return NextResponse.json({ error: 'Validasi cabang sementara tidak tersedia.' }, { status: 503 });
    }
    if ((branches?.length ?? 0) !== new Set(requestedCodes).size) {
      const found = new Set((branches ?? []).map((branch) => branch.code));
      const missing = requestedCodes.find((code) => !found.has(code));
      return NextResponse.json({ error: `Cabang '${missing ?? ''}' tidak ditemukan atau tidak aktif.` }, { status: 400 });
    }
    branchUUIDs = branches?.map((branch) => branch.id) ?? [];
  }

  if (
    name === undefined &&
    role === undefined &&
    branchIds === undefined &&
    isActive === undefined
  ) {
    return NextResponse.json({ message: 'Tidak ada perubahan' });
  }

  const { error: updateError } = await getSupabase().rpc('mycheck_update_person', {
    p_person_id: existing.id,
    p_name: name ?? existing.name,
    p_role: nextRole,
    p_status: nextStatus,
    p_branch_ids: nextRole === 'admin' ? [] : branchUUIDs,
    p_assigned_by: ctx.user.id,
  });
  if (updateError) {
    console.error('MyCheck user update failed:', updateError);
    if (updateError.message.includes('At least one active admin')) {
      return NextResponse.json(
        { error: 'Operasi ditolak. Sistem harus memiliki setidaknya 1 admin aktif.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Pembaruan pengguna gagal.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'User berhasil diperbarui' });
});

export const DELETE = withAuth(async (_req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const decision = decidePermanentDelete('user');
  return NextResponse.json(
    { error: decision.message, reason: decision.reason },
    { status: decision.status }
  );
});
