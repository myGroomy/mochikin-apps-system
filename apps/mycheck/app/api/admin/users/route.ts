import { NextResponse } from 'next/server';
import { createUserSchema } from '@/lib/shared';
import { requireRole, withAuth } from '../../../../lib/api-auth';
import { getSupabase } from '../../../../lib/supabase';
import {
  branchIdsOf,
  insertUser,
  getCabangList,
  listAllUsers,
  type UserRow,
} from '../../../../lib/google/registry-admin';

/** Bentuk user untuk response API (tidak pernah membocorkan PIN). */
function toApiUser(u: UserRow, cabangNames: Map<string, string>) {
  const ids = branchIdsOf(u);
  return {
    id: u.User_ID,
    name: u.Nama,
    username: u.Username,
    role: u.Role,
    isActive: u.Aktif,
    createdAt: u.Created_At || null,
    branchIds: ids,
    branches: ids.map((id) => ({ id, name: cabangNames.get(id) ?? id })),
  };
}

export const GET = // eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: dbPeople } = await supabase
        .from('people')
        .select('id, name, username, role, status, created_at, branch_members(branches(id, code, name))')
        .is('deleted_at', null);

      if (dbPeople && dbPeople.length > 0) {
        return NextResponse.json({
          users: dbPeople.map((p) => {
            const members = Array.isArray(p.branch_members) ? p.branch_members : [];
            const branches = members.map((m: { branches?: { id?: string; code?: string; name?: string }[] | { id?: string; code?: string; name?: string } | null }) => {
              const b = Array.isArray(m.branches) ? m.branches[0] : m.branches;
              return {
                id: b?.code || b?.id || '',
                name: b?.name || b?.code || '',
              };
            }).filter((b: { id: string }) => Boolean(b.id));

            return {
              id: p.id,
              name: p.name,
              username: p.username || '',
              role: p.role,
              isActive: p.status === 'active',
              createdAt: p.created_at,
              branchIds: branches.map((b: { id: string }) => b.id),
              branches,
            };
          }),
        });
      }
    } catch (err) {
      console.warn('⚠️ Supabase users fetch fallback:', err);
    }
  }

  // Fallback pengujian
  const cabangs = await getCabangList();
  const cabangNames = new Map(cabangs.map((c) => [c.Cabang_ID, c.Nama_Cabang]));

  const userList = await listAllUsers();
  const usersWithAccess = userList.map((u) => toApiUser(u, cabangNames));

  return NextResponse.json({ users: usersWithAccess });
});

export const POST = // eslint-disable-next-line @typescript-eslint/no-unused-vars
withAuth(async (_req, ctx, _session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  let body: unknown;
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 });
  }

  const parseResult = createUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Input tidak valid', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { name, username, initialPin, role, branchIds } = parseResult.data;

  const existingUsers = await listAllUsers();
  if (existingUsers.some((u) => u.Username.toLowerCase() === username.toLowerCase())) {
    return NextResponse.json(
      { error: `Username '${username}' sudah digunakan.` },
      { status: 400 }
    );
  }

  const validCabangs = new Set((await getCabangList()).map((c) => c.Cabang_ID));
  const unknownBranch = branchIds.find((b) => !validCabangs.has(b));
  if (unknownBranch) {
    return NextResponse.json(
      { error: `Cabang '${unknownBranch}' tidak terdaftar di Daftar_Cabang.` },
      { status: 400 }
    );
  }

  const effectiveBranchIds = role === 'admin' ? [] : branchIds;
  const newUserId = `U-${Date.now()}`;

  // Tulis ke Supabase jika tersedia
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('people').insert({
        name,
        username,
        role,
        pin_hash: initialPin,
        status: 'active',
      });
    } catch (sbErr) {
      console.warn('⚠️ Supabase user insert warning:', sbErr);
    }
  }

  await insertUser({
    User_ID: newUserId,
    Username: username,
    PIN: initialPin,
    Nama: name,
    Role: role,
    Cabang_ID: effectiveBranchIds.join(','),
    Aktif: true,
    Must_Change_Pin: false,
    Login_Attempts: 0,
    Locked_Until: '',
    Token_Version: 1,
    Created_At: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      user: {
        id: newUserId,
        name,
        username,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        branchIds: effectiveBranchIds,
      },
    },
    { status: 201 }
  );
});
