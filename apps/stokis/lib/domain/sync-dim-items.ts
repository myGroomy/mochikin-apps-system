import { getMasterItems } from './master-item-service';
import { getSupabase } from '../supabase';

export interface SyncedItem {
  itemCode: string;
  name: string;
  weight: number;
  tier: string;
}

/**
 * Calibrates item weight based on 1 Point = 10 Minutes of physical SOP work.
 * Tier 1 (Kemasan / Dry)   : 1 Min -> 0.10 pt
 * Tier 2 (Curah / Timbang) : 3 Min -> 0.30 pt
 * Tier 3 (Basah / Chiller) : 5 Min -> 0.50 pt
 */
export function calibrateItemTier(item: {
  Nama_Barang?: unknown;
  Area?: unknown;
  Satuan?: unknown;
  Point?: number | null;
}): { weight: number; tier: 'tier_1' | 'tier_2' | 'tier_3' | 'standard' } {
  if (item.Point !== null && item.Point !== undefined && !isNaN(Number(item.Point)) && Number(item.Point) > 0) {
    const p = Number(item.Point);
    const tier = p >= 0.5 ? 'tier_3' : p >= 0.3 ? 'tier_2' : 'tier_1';
    return { weight: p, tier };
  }

  const name = String(item.Nama_Barang || '').toLowerCase();
  const area = String(item.Area || '').toLowerCase();

  // Tier 3: Basah / Daging / Chiller / Freezer (5 menit timbang + periksa)
  if (
    name.includes('ayam') ||
    name.includes('daging') ||
    name.includes('minyak') ||
    name.includes('marinasi') ||
    area.includes('chiller') ||
    area.includes('freezer')
  ) {
    return { weight: 0.50, tier: 'tier_3' };
  }

  // Tier 1: Kemasan visual / Dry packaging (1 menit hitung)
  if (
    name.includes('cup') ||
    name.includes('box') ||
    name.includes('dus') ||
    name.includes('plastik') ||
    name.includes('sedotan') ||
    name.includes('kemasan')
  ) {
    return { weight: 0.10, tier: 'tier_1' };
  }

  // Tier 2: Bahan curah standar (3 menit)
  return { weight: 0.30, tier: 'tier_2' };
}

/**
 * Syncs master items from Google Sheets Master_Item to Supabase dim_item catalog.
 */
export async function syncMasterItemsToDimItem(
  cabangId: string,
  supabaseClient?: unknown
): Promise<{ synced: number; items: SyncedItem[] }> {
  const supabase = (supabaseClient || getSupabase()) as any;
  if (!supabase) {
    return { synced: 0, items: [] };
  }

  const masterItems = await getMasterItems(cabangId).catch(() => []);
  if (!masterItems || masterItems.length === 0) {
    return { synced: 0, items: [] };
  }

  const syncedItems: SyncedItem[] = [];

  for (const it of masterItems) {
    const row = it as Record<string, unknown>;
    const itemCode = String(row['Item_ID'] || '').trim();
    const itemName = String(row['Nama_Barang'] || itemCode).trim();
    if (!itemCode) continue;

    const { weight, tier } = calibrateItemTier(it);

    const { error } = await supabase.from('dim_item').upsert(
      {
        app_id: 'stokis',
        item_code: itemCode,
        item_name: itemName,
        default_weight: weight,
        tier,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'app_id,item_code' }
    );

    if (!error) {
      syncedItems.push({ itemCode, name: itemName, weight, tier });
    }
  }

  return { synced: syncedItems.length, items: syncedItems };
}
