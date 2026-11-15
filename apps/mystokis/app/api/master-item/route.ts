// app/api/master-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getMasterItemsFromDb } from '@/lib/domain/stokis-repository';
import { getSupabase } from '@/lib/supabase';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const cabangId = searchParams.get('cabang') || '';
    const items = await getMasterItemsFromDb(cabangId);
    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat master item';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { Nama_Barang, Area, Satuan, Threshold, Tipe_Input, Point, Keterangan } = body;

    if (!Nama_Barang) {
      return NextResponse.json(
        { success: false, error: { message: 'Nama_Barang wajib diisi' } },
        { status: 400 }
      );
    }

    const code = Nama_Barang.trim().toUpperCase().replace(/\s+/g, '_');
    const supabase = getSupabase();

    const { data: item, error: insErr } = await supabase
      .from('stokis_items')
      .insert({
        code,
        name: Nama_Barang.trim(),
        category: Keterangan || 'Bahan Baku',
        area: Area || 'Kitchen',
        unit: Satuan || 'kg',
        default_weight: Point != null ? Number(Point) : 1.00,
        threshold: Threshold != null ? Number(Threshold) : 0,
        tipe_input: Tipe_Input || 'dual',
        is_active: true,
      })
      .select('id, code')
      .single();

    if (insErr) {
      throw new Error(`Gagal menambahkan master item: ${insErr.message}`);
    }

    return NextResponse.json(
      { success: true, data: { itemId: item.code || item.id } },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menambahkan master item';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}, { requiredRole: 'admin' });
