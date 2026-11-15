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
      if (!supabase) {
        return NextResponse.json({ success: true, history: [] });
      }

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

    // Ambil legacy point_items jika ada
    let legacyMap = new Map<string, number>();
    if (supabase) {
      const { data: legacyItems } = await supabase
        .from('point_items')
        .select('name, points')
        .eq('app_id', 'stokis');

      if (legacyItems) {
        for (const it of legacyItems) {
          legacyMap.set(it.name.toLowerCase().trim(), Number(it.points));
        }
      }
    }

    const items = masterItems.map((it: any) => {
      const nameKey = String(it.Nama_Barang || '').toLowerCase().trim();
      let effectivePoint: number;
      let source: 'master' | 'legacy' | 'default';

      if (it.Point !== null && it.Point !== undefined && !isNaN(Number(it.Point))) {
        effectivePoint = Number(it.Point);
        source = 'master';
      } else if (legacyMap.has(nameKey)) {
        effectivePoint = legacyMap.get(nameKey)!;
        source = 'legacy';
      } else {
        effectivePoint = 1.0;
        source = 'default';
      }

      return {
        itemId: it.Item_ID,
        name: it.Nama_Barang,
        area: it.Area,
        point: effectivePoint,
        masterPoint: it.Point ?? null,
        source,
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
      const sheetUpdates: Array<{ itemId: string; point: number | null }> = [];
      const auditPromises: Promise<any>[] = [];

      for (const u of updates) {
        const { itemId, name, points, oldPoints, reason } = u;
        if (!itemId) continue;

        const isReset = action === 'reset' || points === null || points === undefined || points === '';

        if (isReset) {
          sheetUpdates.push({ itemId, point: null });

          if (supabase) {
            const record = buildChangeRecord({
              appId: 'stokis',
              entityType: 'master_item',
              entityRef: itemId,
              entityLabel: name || null,
              oldPoints: oldPoints != null ? Number(oldPoints) : null,
              newPoints: 1.0, // default value
              action: 'reset',
              reason: reason || 'Reset ke bobot default',
              changedBy: session.username || session.nama || 'admin',
            });
            auditPromises.push(logPointMasterChange(supabase, record));
          }
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

          sheetUpdates.push({ itemId, point: validation.value });

          if (supabase) {
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
      }

      // Tulis ke Google Sheets
      if (sheetUpdates.length > 0) {
        await batchUpdate(cabangId, sheetUpdates);
      }

      // Catat ke audit log Supabase
      if (auditPromises.length > 0) {
        await Promise.all(auditPromises);
      }

      return NextResponse.json({
        success: true,
        updatedCount: sheetUpdates.length,
        message: `Berhasil memperbarui poin untuk ${sheetUpdates.length} master item`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan server saat menyimpan poin';
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  },
  { requiredRole: 'admin' }
);
