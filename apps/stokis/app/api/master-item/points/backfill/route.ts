import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import { getMasterItems, batchUpdate } from '@/lib/domain/master-item-service';
import { logPointMasterChange, buildChangeRecord } from '@mochikin/shared/points';

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const body = await req.json().catch(() => ({}));
      const dryRun = searchParams.get('dryRun') !== 'false' && body?.dryRun !== false;
      const cabangId = searchParams.get('cabangId') || body?.cabangId || session.cabangId || 'BJ01';

      const supabase = getSupabase();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Database Supabase tidak terhubung' },
          { status: 500 }
        );
      }

      // 1. Ambil semua master items dari Google Sheets
      const masterItems = await getMasterItems(cabangId);

      // 2. Ambil point_items dari Supabase
      const { data: legacyItems, error: legErr } = await supabase
        .from('point_items')
        .select('*')
        .eq('app_id', 'stokis');

      if (legErr) throw legErr;

      const legacyMap = new Map<string, number>();
      (legacyItems || []).forEach((it) => {
        legacyMap.set(it.name.toLowerCase().trim(), Number(it.points));
      });

      // 3. Cari item yang di master sheet belum ada poinnya tapi ada di legacy
      const candidates: Array<{
        itemId: string;
        name: string;
        currentPoint: number | null;
        legacyPoint: number;
      }> = [];

      for (const item of masterItems as any[]) {
        const key = String(item.Nama_Barang || '').toLowerCase().trim();
        const hasLegacy = legacyMap.has(key);
        const currentPoint = item.Point !== null && item.Point !== undefined && !isNaN(Number(item.Point))
          ? Number(item.Point)
          : null;

        if (hasLegacy && currentPoint === null) {
          candidates.push({
            itemId: item.Item_ID,
            name: item.Nama_Barang,
            currentPoint: null,
            legacyPoint: legacyMap.get(key)!,
          });
        }
      }

      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          message: `Simulasi backfill selesai: ${candidates.length} item ditemukan untuk dimigrasikan`,
          totalCandidates: candidates.length,
          candidates,
        });
      }

      // Eksekusi nyata jika dryRun === false
      const updates = candidates.map((c) => ({
        itemId: c.itemId,
        point: c.legacyPoint,
      }));

      if (updates.length > 0) {
        await batchUpdate(cabangId, updates);

        const auditPromises = candidates.map((c) => {
          const rec = buildChangeRecord({
            appId: 'stokis',
            entityType: 'master_item',
            entityRef: c.itemId,
            entityLabel: c.name,
            oldPoints: null,
            newPoints: c.legacyPoint,
            action: 'set',
            reason: 'Migrasi backfill otomatis dari legacy point_items',
            changedBy: session.username || session.nama || 'system_migration',
          });
          return logPointMasterChange(supabase, rec);
        });

        await Promise.all(auditPromises);
      }

      return NextResponse.json({
        success: true,
        dryRun: false,
        message: `Berhasil memigrasikan ${candidates.length} item ke Google Sheets master`,
        migratedCount: candidates.length,
        items: candidates,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan server saat migrasi backfill';
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  },
  { requiredRole: 'admin' }
);
