// app/api/petugas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

interface BranchRelation {
  code?: string;
}

interface BranchMemberRelation {
  branches?: BranchRelation | BranchRelation[] | null;
}

interface PersonRow {
  id: string;
  name: string;
  role: string;
  status: string;
  branch_members?: BranchMemberRelation[] | null;
}

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const cabangFilter = searchParams.get('cabang')?.trim();
  const supabase = getSupabase();

  const { data: people, error } = await supabase
    .from('people')
    .select('id, name, role, status, branch_members(branches(code))')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  const rawList = (people || []) as unknown as PersonRow[];
  let list = rawList.map((p) => {
    const members = Array.isArray(p.branch_members) ? p.branch_members : [];
    const branchCodes: string[] = members
      .map((m) => (Array.isArray(m.branches) ? m.branches[0]?.code : m.branches?.code))
      .filter((c): c is string => Boolean(c));

    return {
      Petugas_ID: p.id,
      Nama_Petugas: p.name,
      Role: p.role,
      Cabang_ID: branchCodes.join(','),
      Aktif: p.status === 'active',
    };
  });

  if (cabangFilter) {
    list = list.filter((p) => {
      const codes = p.Cabang_ID.split(',').map((c: string) => c.trim().toUpperCase());
      return codes.includes(cabangFilter.toUpperCase());
    });
  }

  return NextResponse.json({ success: true, data: list }, { status: 200 });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const supabase = getSupabase();

  const name = body.Nama_Petugas || body.nama || body.name || '';
  if (!name.trim()) {
    return NextResponse.json({ success: false, error: { message: 'Nama petugas wajib diisi' } }, { status: 400 });
  }

  const cabangId = body.cabangId || body.Cabang_ID || body.cabang || '';
  let branchId: string | null = null;
  if (cabangId) {
    const token = String(cabangId).split(',')[0].trim();
    if (token) {
      const query = supabase.from('branches').select('id');
      const { data: b } = isUuid(token)
        ? await query.eq('id', token).maybeSingle()
        : await query.ilike('code', token).maybeSingle();
      if (b?.id) branchId = b.id;
    }
  }

  if (!branchId) {
    const { data: defBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle();
    if (defBranch?.id) branchId = defBranch.id;
  }

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'petugas';
  const email = body.email || `${safeName}_${Date.now()}@mochikin.local`;
  const role = body.Role || body.role || 'petugas';

  const { data: person, error: personErr } = await supabase
    .from('people')
    .insert({
      name,
      role,
      status: 'active',
      email,
      branch_id: branchId,
    })
    .select('id')
    .single();

  if (personErr || !person) {
    return NextResponse.json({ success: false, error: { message: personErr?.message || 'Gagal menambahkan petugas' } }, { status: 400 });
  }

  if (branchId) {
    await supabase.from('branch_members').upsert(
      {
        person_id: person.id,
        branch_id: branchId,
        is_active: true,
      },
      { onConflict: 'branch_id,person_id' }
    );
  }

  return NextResponse.json({ success: true, data: { petugasId: person.id } }, { status: 201 });
}, { requiredRole: 'admin' });
