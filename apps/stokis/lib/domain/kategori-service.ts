// lib/domain/kategori-service.ts
// Operasi Kategori (Area) via Supabase stokis_items

import { getSupabase } from '@/lib/supabase';

export const DEFAULT_KATEGORI_SEED = [
  'Meja Biru Depan',
  'Chiller',
  'Freezer Ayam dan Alat',
  'Barang Alat dan Kebersihan',
  'Meja Laci',
  'Gas dan Utilitas',
  'Area Umum',
];

export interface KategoriItem {
  Kategori_ID: string;
  Nama_Kategori: string;
  Urutan: number;
  Aktif: boolean;
}

export async function getKategoriList(cabangId?: string, _includeNonaktif = false): Promise<KategoriItem[]> {
  const supabase = getSupabase();
  const { data: items } = await supabase
    .from('stokis_items')
    .select('area')
    .is('deleted_at', null);

  const areasFromDb = Array.from(new Set((items || []).map((i) => i.area).filter(Boolean)));
  const allAreas = Array.from(new Set([...DEFAULT_KATEGORI_SEED, ...areasFromDb]));

  return allAreas.map((area, idx) => ({
    Kategori_ID: area.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
    Nama_Kategori: area,
    Urutan: idx + 1,
    Aktif: true,
  }));
}

export async function addKategori(_cabangId: string, payload: { Nama_Kategori: string; Urutan?: number }): Promise<KategoriItem> {
  const nama = String(payload.Nama_Kategori || '').trim();
  const id = nama.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return {
    Kategori_ID: id,
    Nama_Kategori: nama,
    Urutan: payload.Urutan || 99,
    Aktif: true,
  };
}

export async function updateKategori(
  _cabangId: string,
  kategoriId: string,
  payload: { Nama_Kategori?: string; Urutan?: number; Aktif?: boolean }
): Promise<{ kategoriId: string; updated: boolean }> {
  if (payload.Nama_Kategori) {
    const supabase = getSupabase();
    await supabase
      .from('stokis_items')
      .update({ area: payload.Nama_Kategori })
      .ilike('area', kategoriId.replace(/_/g, ' '));
  }
  return { kategoriId, updated: true };
}
