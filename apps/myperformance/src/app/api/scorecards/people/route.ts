import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth-guard';
import { getRoleCapabilities } from '@/lib/roles';

/**
 * Daftar rekan kerja yang boleh dinilai oleh pengguna saat ini.
 *
 * Identitas pencatat diambil dari sesi SSO, bukan dari parameter klien, dan
 * hasilnya dibatasi ke cabang yang sama agar penilaian tidak lintas cabang.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthContext(req);
    const capabilities = getRoleCapabilities(auth.role);

    if (!auth.personId || auth.personId === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json(
        { success: false, error: 'Sesi pengguna tidak ditemukan' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    const requestedBranch = new URL(req.url).searchParams.get('branch_id');
    const branchId = capabilities.canViewAllBranches
      ? requestedBranch || auth.branchId
      : auth.branchId;

    if (!branchId) {
      return NextResponse.json({ success: true, people: [] });
    }

    const { data, error } = await supabase
      .from('people')
      .select('id, name')
      .eq('branch_id', branchId)
      .neq('id', auth.personId)
      .order('name', { ascending: true })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({ success: true, people: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
