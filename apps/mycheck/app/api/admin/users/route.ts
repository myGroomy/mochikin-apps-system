import { NextResponse } from 'next/server';
import { createUserSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import { getSupabase } from '../../../../lib/supabase';
import { hashPin } from '../../../../lib/pin';

export const GET = withAuth(async (_req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const { data: people, error } = await getSupabase()
    .from('people')
    .select('id,name,username,role,status,created_at,branch_members(branches(code,name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('MyCheck user list failed:', error);
    return NextResponse.json({ error: 'Daftar pengguna sementara tidak tersedia.' }, { status: 503 });
  }

  return NextResponse.json({
    users: (people ?? []).map((person) => {
      const branches = (person.branch_members ?? [])
        .map((member) => {
          const branch = Array.isArray(member.branches) ? member.branches[0] : member.branches;
          return { id: branch?.code ?? '', name: branch?.name ?? branch?.code ?? '' };
        })
        .filter((branch) => Boolean(branch.id));
      return {
        id: person.id,
        name: person.name,
        username: person.username ?? '',
        role: ['admin', 'role_admin', 'super_admin'].includes(person.role) ? 'admin' : 'petugas',
        isActive: person.status === 'active',
        createdAt: person.created_at,
        branchIds: branches.map((branch) => branch.id),
        branches,
      };
    }),
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, username, initialPin, role, branchIds } = parsed.data;
  const branchCodes = role === 'admin' ? [] : [...new Set(branchIds)];
  if (role !== 'admin' && branchCodes.length === 0) {
    return NextResponse.json({ error: 'Petugas harus ditugaskan ke minimal satu cabang.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: duplicate, error: duplicateError } = await supabase
    .from('people')
    .select('id')
    .ilike('username', username.replace(/[\\%_]/g, '\\$&'))
    .is('deleted_at', null)
    .maybeSingle();
  if (duplicateError) {
    console.error('MyCheck username check failed:', duplicateError);
    return NextResponse.json({ error: 'Pembuatan pengguna sementara tidak tersedia.' }, { status: 503 });
  }
  if (duplicate) {
    return NextResponse.json({ error: `Username '${username}' sudah digunakan.` }, { status: 400 });
  }

  const { data: branches, error: branchError } = branchCodes.length
    ? await supabase.from('branches').select('id,code').in('code', branchCodes).eq('status', 'active').is('deleted_at', null)
    : await supabase.from('branches').select('id,code').eq('status', 'active').is('deleted_at', null).order('code').limit(1);
  if (branchError) {
    console.error('MyCheck branch validation failed:', branchError);
    return NextResponse.json({ error: 'Validasi cabang sementara tidak tersedia.' }, { status: 503 });
  }
  if (branchCodes.length && (branches?.length ?? 0) !== branchCodes.length) {
    const found = new Set((branches ?? []).map((branch) => branch.code));
    const missing = branchCodes.find((code) => !found.has(code));
    return NextResponse.json({ error: `Cabang '${missing ?? ''}' tidak ditemukan atau tidak aktif.` }, { status: 400 });
  }
  if (!branches?.length) {
    return NextResponse.json({ error: 'Tidak ada cabang aktif untuk akun ini.' }, { status: 400 });
  }

  const { data: userId, error: createError } = await supabase.rpc('mycheck_create_person', {
    p_name: name,
    p_username: username,
    p_email: `${username}@mycheck.local`,
    p_pin_hash: hashPin(initialPin),
    p_role: role,
    p_branch_ids: branchCodes.length ? branches.map((branch) => branch.id) : [],
    p_created_by: ctx.user.id,
  });
  if (createError) {
    console.error('MyCheck user creation failed:', createError);
    if (createError.code === '23505') {
      return NextResponse.json({ error: `Username '${username}' sudah digunakan.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Pembuatan pengguna gagal.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      user: {
        id: userId,
        name,
        username,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        branchIds: branchCodes,
      },
    },
    { status: 201 }
  );
});
