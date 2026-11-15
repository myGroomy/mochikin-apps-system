// app/api/users/route.ts
import { scryptSync, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

interface BranchRelation {
  code?: string;
}

interface BranchMemberRelation {
  branches?: BranchRelation | BranchRelation[] | null;
}

interface PersonUserRow {
  id: string;
  username?: string | null;
  name: string;
  role: string;
  status: string;
  branch_members?: BranchMemberRelation[] | null;
}

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}$${hash}`;
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const cabangFilter = searchParams.get('cabang')?.trim();
  const supabase = getSupabase();

  const { data: people, error } = await supabase
    .from('people')
    .select('id, username, name, role, status, branch_members(branches(code))')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  const rawList = (people || []) as unknown as PersonUserRow[];
  let list = rawList.map((p) => {
    const members = Array.isArray(p.branch_members) ? p.branch_members : [];
    const branchCodes: string[] = members
      .map((m) => (Array.isArray(m.branches) ? m.branches[0]?.code : m.branches?.code))
      .filter((c): c is string => Boolean(c));

    return {
      User_ID: p.id,
      Username: p.username || '',
      Nama: p.name,
      Role: p.role,
      Cabang_ID: branchCodes.join(','),
      Aktif: p.status === 'active',
    };
  });

  if (cabangFilter) {
    list = list.filter((u) => {
      const codes = u.Cabang_ID.split(',').map((c) => c.trim().toUpperCase());
      return codes.includes(cabangFilter.toUpperCase());
    });
  }

  return NextResponse.json({ success: true, data: list }, { status: 200 });
}, { requiredRole: 'admin' });

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const supabase = getSupabase();

  const username = body.username ? String(body.username).trim() : '';
  const name = body.nama || body.name || body.Nama || username;
  if (!name.trim()) {
    return NextResponse.json({ success: false, error: { message: 'Nama wajib diisi' } }, { status: 400 });
  }

  const tokens = String(body.cabangId || body.Cabang_ID || body.cabang || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  let primaryBranchId: string | null = null;
  const branchIds: string[] = [];

  for (const t of tokens) {
    const query = supabase.from('branches').select('id');
    const { data: b } = isUuid(t)
      ? await query.eq('id', t).maybeSingle()
      : await query.ilike('code', t).maybeSingle();
    if (b?.id && !branchIds.includes(b.id)) {
      branchIds.push(b.id);
      if (!primaryBranchId) primaryBranchId = b.id;
    }
  }

  if (!primaryBranchId) {
    const { data: defBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle();
    if (defBranch?.id) primaryBranchId = defBranch.id;
  }

  const safeName = (username || name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const email = body.email || `${safeName}_${Date.now()}@mochikin.local`;
  const pinHash = body.pin ? hashPin(String(body.pin).trim()) : null;
  const role = body.role || body.Role || 'petugas';

  const { data: person, error: personErr } = await supabase
    .from('people')
    .insert({
      name,
      username: username || null,
      role,
      status: 'active',
      pin_hash: pinHash,
      email,
      branch_id: primaryBranchId,
    })
    .select('id')
    .single();

  if (personErr || !person) {
    return NextResponse.json({ success: false, error: { message: personErr?.message || 'Gagal menambahkan user' } }, { status: 400 });
  }

  for (const bId of branchIds) {
    await supabase.from('branch_members').upsert(
      {
        person_id: person.id,
        branch_id: bId,
        is_active: true,
      },
      { onConflict: 'branch_id,person_id' }
    );
  }

  return NextResponse.json({ success: true, data: { userId: person.id } }, { status: 201 });
}, { requiredRole: 'admin' });
