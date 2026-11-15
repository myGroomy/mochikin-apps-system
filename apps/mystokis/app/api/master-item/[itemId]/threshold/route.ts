import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PATCH = withAuth(async (req: NextRequest, { params }, session) => {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const { cabangId, threshold } = body;

    if (!cabangId) {
      return NextResponse.json(
        { success: false, error: { message: 'cabangId wajib diisi' } },
        { status: 400 }
      );
    }

    const guard = assertCabangAccess(session, cabangId);
    if (guard) return guard;

    const supabase = getSupabase();

    // 1. Resolve branch id from branches (code = cabangId or id = cabangId)
    const branchQuery = isUuid(cabangId)
      ? supabase.from('branches').select('id, code').eq('id', cabangId).maybeSingle()
      : supabase.from('branches').select('id, code').eq('code', cabangId).maybeSingle();
    const { data: branch, error: branchErr } = await branchQuery;

    if (branchErr || !branch) {
      return NextResponse.json(
        { success: false, error: { message: `Cabang ${cabangId} tidak ditemukan` } },
        { status: 404 }
      );
    }

    // 2. Resolve item id from stokis_items (code = itemId or id = itemId)
    const itemQuery = isUuid(itemId)
      ? supabase.from('stokis_items').select('id, code').eq('id', itemId).maybeSingle()
      : supabase.from('stokis_items').select('id, code').eq('code', itemId).maybeSingle();
    const { data: item, error: itemErr } = await itemQuery;

    if (itemErr || !item) {
      return NextResponse.json(
        { success: false, error: { message: `Item ${itemId} tidak ditemukan` } },
        { status: 404 }
      );
    }

    const numThreshold = threshold != null ? Number(threshold) : 0;

    // 3. Upsert into stokis_branch_thresholds
    const { error: upsertErr } = await supabase
      .from('stokis_branch_thresholds')
      .upsert(
        {
          branch_id: branch.id,
          branch_code: branch.code,
          item_id: item.id,
          item_code: item.code,
          threshold: numThreshold,
          min_stock: numThreshold,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'branch_id,item_id' }
      );

    if (upsertErr) {
      return NextResponse.json(
        { success: false, error: { message: upsertErr.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { itemId, threshold: numThreshold } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui threshold';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});
