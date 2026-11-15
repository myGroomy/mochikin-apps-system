// app/api/laporan/[laporanId]/detail/route.ts
// GET: detail item laporan dari Supabase RDBMS
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getOpnameDetailFromDb } from '@/lib/domain/stokis-repository';

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const cabangId = req.nextUrl.searchParams.get('cabang') || '';

  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabang wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  try {
    const detail = await getOpnameDetailFromDb(laporanId);
    if (!detail || !detail.header) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' } },
        { status: 404 }
      );
    }

    const data = detail.items.map((r) => ({
      Laporan_ID: detail.header.laporanId,
      Tanggal_Operasional: detail.header.tanggalOperasional,
      Shift: detail.header.shift,
      Petugas: detail.header.petugas,
      Item_ID: r.itemId,
      Nama_Barang: r.namaBarang,
      Area: r.area,
      Satuan: r.satuan,
      Threshold: r.threshold,
      Prev_Step1: r.step1,
      Prev_Step2: r.step2,
      Prev_Total: r.total,
      Step1: r.step1,
      Step2: r.step2,
      Total: r.total,
      Penggunaan: r.penggunaan,
      Keterangan: '',
      Status: r.status,
      Tipe_Input: 'dual',
      Status_Isi: r.statusIsi,
      Tgl_Refill: r.tglRefill,
      Tgl_Pakai: r.tglPakai,
      Note: r.note,
      Tgl_Kedaluwarsa: r.tglKedaluwarsa,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 400 }
    );
  }
});
