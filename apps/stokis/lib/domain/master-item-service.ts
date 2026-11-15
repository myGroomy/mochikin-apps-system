// lib/domain/master-item-service.ts
// Operasi Master Item via Supabase RDBMS

import { getMasterItemsFromDb } from './stokis-repository';
import { getSupabase } from '@/lib/supabase';
import { parseThreshold } from './so';

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
  for (const u of updates) {
    if (u.point !== undefined) {
      await supabase
        .from('stokis_items')
        .update({ points_weight: u.point })
        .eq('id', u.itemId);
    }
  }
  return { updated: updates.length };
}
