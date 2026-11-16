// lib/domain/master-item-service.ts
// Operasi Master Item via Supabase RDBMS

import { getMasterItemsFromDb } from './stokis-repository';
import { getSupabase } from '@/lib/supabase';

// ── Tipe Input normalization ─────────────────────────────────

const BASE_TYPES = ['dual', 'single', 'boolean', 'date', 'text', 'expiry'] as const;

export function normalizeTipeInput(raw: unknown): string {
  if (raw === undefined || raw === null) return 'dual';
  const val = String(raw).toLowerCase().trim();
  if (val === '') return '';
  const allowedBase = new Set<string>(BASE_TYPES);
  const parts = val.split(',').map((t) => t.trim()).filter((t) => allowedBase.has(t));
  const unique = [...new Set(parts)];
  if (unique.includes('dual') && unique.includes('single')) {
    unique.splice(unique.indexOf('single'), 1);
  }
  return unique.join(',');
}

export interface MasterItemPayload {
  Nama_Barang: string;
  Area: string;
  Satuan: string;
  Konversi_Isi?: string;
  Konversi_Keterangan?: string;
  Threshold?: number | string;
  Tipe_Input?: string;
  Keterangan?: string;
  Point?: number | string;
}

export async function getMasterItems(cabangId?: string) {
  return getMasterItemsFromDb(cabangId);
}

export async function batchUpdate(
  _cabangId: string,
  updates: Array<{ itemId: string; point?: number | null }>
) {
  const supabase = getSupabase();
  let updated = 0;

  for (const u of updates) {
    if (u.point === undefined) continue;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.itemId);
    const weight = u.point ?? 1;
    const { data: item, error: itemError } = await supabase
      .from('stokis_items')
      .update({ default_weight: weight })
      .eq(isUuid ? 'id' : 'code', u.itemId)
      .select('code, name')
      .single();
    if (itemError) throw new Error(`Gagal memperbarui bobot master item ${u.itemId}: ${itemError.message}`);

    const { error: catalogError } = await supabase.from('dim_item').upsert(
      {
        app_id: 'stokis',
        item_code: item.code,
        item_name: item.name,
        default_weight: weight,
        is_active: true,
      },
      { onConflict: 'app_id,item_code' }
    );
    if (catalogError) throw new Error(`Gagal memperbarui katalog poin ${item.code}: ${catalogError.message}`);
    updated += 1;
  }

  return { updated };
}
