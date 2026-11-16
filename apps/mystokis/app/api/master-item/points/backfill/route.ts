import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getMasterItems } from '@/lib/domain/master-item-service';
import { syncMasterItemsToDimItem } from '@/lib/domain/sync-dim-items';

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const body = await req.json().catch(() => ({}));
      const dryRun = searchParams.get('dryRun') !== 'false' && body?.dryRun !== false;
      const cabangId = searchParams.get('cabangId') || body?.cabangId || session.cabangId;
      const items = await getMasterItems(cabangId);

      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          totalCandidates: items.length,
          items: items.map((item) => ({
            itemId: item.Item_ID,
            name: item.Nama_Barang,
            point: item.Point,
          })),
        });
      }

      const result = await syncMasterItemsToDimItem(cabangId);
      return NextResponse.json({
        success: true,
        dryRun: false,
        syncedCount: result.synced,
        items: result.items,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kesalahan server saat sinkronisasi katalog poin';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  },
  { requiredRole: 'admin' }
);
