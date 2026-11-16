import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import { getMasterItems, batchUpdate } from '@/lib/domain/master-item-service';
import {
  validateMasterPoints,
  logPointMasterChange,
  buildChangeRecord,
  PointMasterAction,
} from '@mochikin/shared/points';

// ── GET: Ambil daftar master item dengan poin efektif atau riwayat perubahan ──
export const GET = withAuth(async (req: NextRequest, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const historyMode = searchParams.get('history') === 'true';
    const cabangId = searchParams.get('cabangId') || session.cabangId || 'BJ01';
    const supabase = getSupabase();

    // Mode 1: Riwayat perubahan audit point_master_changes
    if (historyMode) {
      const entityRef = searchParams.get('itemId');
      let query = supabase
        .from('point_master_changes')
        .select('*')
        .eq('app_id', 'stokis')
        .order('changed_at', { ascending: false })
        .limit(30);

      if (entityRef) {
        query = query.eq('entity_ref', entityRef);
      }

      const { data, error } = await query;
      if (error) throw error;

      return NextResponse.json({
        success: true,
        history: data || [],
      });
    }

    // Mode 2: Daftar master item dengan poin efektif & sumber
    const masterItems = await getMasterItems(cabangId);

    const items = masterItems.map((it: any) => {
      return {
        itemId: it.Item_ID,
        name: it.Nama_Barang,
        area: it.Area,
        point: Number(it.Point ?? 1),
        masterPoint: it.Point ?? null,
        source: 'master',
      };
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal memuat master poin';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});

// ── POST: Update poin master item (single atau batch) ────────────────────────
export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    try {
      const body = await req.json();
      const { cabangId: reqCabang, action = 'set', updates } = body;
      const cabangId = reqCabang || session.cabangId || 'BJ01';

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Data updates wajib berupa array tidak kosong' },
          { status: 400 }
        );
      }

      const supabase = getSupabase();
      const pointUpdates: Array<{ itemId: string; point: number | null }> = [];
      const auditPromises: Promise<any>[] = [];

      for (const u of updates) {
        const { itemId, name, points, oldPoints, reason } = u;
        if (!itemId) continue;

        const isReset = action === 'reset' || points === null || points === undefined || points === '';

        if (isReset) {
          pointUpdates.push({ itemId, point: null });

          const record = buildChangeRecord({
            appId: 'stokis',
            entityType: 'master_item',
            entityRef: itemId,
            entityLabel: name || null,
            oldPoints: oldPoints != null ? Number(oldPoints) : null,
            newPoints: 1.0,
            action: 'reset',
            reason: reason || 'Reset ke bobot default',
            changedBy: session.username || session.nama || 'admin',
          });
          auditPromises.push(logPointMasterChange(supabase, record));
        } else {
          const validation = validateMasterPoints(points);
          if (!validation.valid) {
            return NextResponse.json(
              {
                success: false,
                error: `Item "${name || itemId}": ${validation.error}`,
              },
              { status: 400 }
            );
          }

          pointUpdates.push({ itemId, point: validation.value });

          const record = buildChangeRecord({
            appId: 'stokis',
            entityType: 'master_item',
            entityRef: itemId,
            entityLabel: name || null,
            oldPoints: oldPoints != null ? Number(oldPoints) : null,
            newPoints: validation.value,
            action: (action as PointMasterAction) || 'set',
            reason: reason || null,
            changedBy: session.username || session.nama || 'admin',
          });
          auditPromises.push(logPointMasterChange(supabase, record));
        }
      }

      if (pointUpdates.length > 0) {
        await batchUpdate(cabangId, pointUpdates);
      }

      // Catat ke audit log Supabase
      if (auditPromises.length > 0) {
        await Promise.all(auditPromises);
      }

      return NextResponse.json({
        success: true,
        updatedCount: pointUpdates.length,
        message: `Berhasil memperbarui poin untuk ${pointUpdates.length} master item`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan server saat menyimpan poin';
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  },
  { requiredRole: 'admin' }
);
