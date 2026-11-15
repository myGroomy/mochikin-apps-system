import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  try {
    const body = await req.json();
    const { cabangId, updates } = body;

    if (!cabangId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'bad_request', message: 'cabangId dan updates diperlukan' } },
        { status: 400 }
      );
    }

    const guard = assertCabangAccess(session, cabangId);
    if (guard) return guard;

    const supabase = getSupabase();

    // 1. Resolve branch
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

    // 2. Fetch all items to resolve itemId (id or code)
    const { data: itemsList, error: itemsErr } = await supabase
      .from('stokis_items')
      .select('id, code');

    if (itemsErr) {
      return NextResponse.json(
        { success: false, error: { message: itemsErr.message } },
        { status: 500 }
      );
    }

    const itemMap = new Map<string, { id: string; code: string }>();
    for (const it of itemsList || []) {
      itemMap.set(it.id, it);
      itemMap.set(it.code, it);
    }

    const thresholdUpserts: Array<{
      branch_id: string;
      branch_code: string;
      item_id: string;
      item_code: string;
      threshold: number;
      min_stock: number;
      updated_at: string;
    }> = [];

    const nowIso = new Date().toISOString();

    for (const u of updates) {
      const item = itemMap.get(u.itemId);
      const targetId = item ? item.id : (isUuid(u.itemId) ? u.itemId : null);
      const targetCode = item ? item.code : (!isUuid(u.itemId) ? u.itemId : null);

      if (item && u.threshold != null) {
        const numTh = Number(u.threshold) || 0;
        thresholdUpserts.push({
          branch_id: branch.id,
          branch_code: branch.code,
          item_id: item.id,
          item_code: item.code,
          threshold: numTh,
          min_stock: numTh,
          updated_at: nowIso,
        });
      }

      // Fields for stokis_items: tipe_input, status/is_active, notes/category
      const itemUpdate: Record<string, any> = {};

      if (u.tipeInput !== undefined || u.tipe_input !== undefined) {
        itemUpdate.tipe_input = u.tipeInput ?? u.tipe_input;
      }

      if (u.status !== undefined) {
        itemUpdate.status = u.status;
        itemUpdate.is_active = u.status === 'active';
      } else if (u.aktif !== undefined) {
        const isAktif = Boolean(u.aktif);
        itemUpdate.status = isAktif ? 'active' : 'inactive';
        itemUpdate.is_active = isAktif;
      }

      if (u.keterangan !== undefined || u.notes !== undefined) {
        const noteVal = u.keterangan ?? u.notes;
        itemUpdate.notes = noteVal;
        itemUpdate.category = noteVal;
      }

      if (Object.keys(itemUpdate).length > 0) {
        const updateQuery = supabase.from('stokis_items').update(itemUpdate);
        if (targetId) {
          await updateQuery.eq('id', targetId);
        } else if (targetCode) {
          await updateQuery.eq('code', targetCode);
        }
      }
    }

    if (thresholdUpserts.length > 0) {
      const { error: threshErr } = await supabase
        .from('stokis_branch_thresholds')
        .upsert(thresholdUpserts, { onConflict: 'branch_id,item_id' });

      if (threshErr) {
        return NextResponse.json(
          { success: false, error: { message: threshErr.message } },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, data: { updated: updates.length } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses batch update';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});
