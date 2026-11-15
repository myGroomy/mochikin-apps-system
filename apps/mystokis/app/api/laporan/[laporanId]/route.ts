// app/api/laporan/[laporanId]/route.ts
// GET: ambil metadata satu laporan dari Supabase RDBMS
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
        { success: false, error: { code: 'NOT_FOUND', message: `Laporan ${laporanId} tidak ditemukan` } },
        { status: 404 }
      );
    }
    const h = detail.header;
    return NextResponse.json({
      success: true,
      data: {
        Laporan_ID: h.laporanId,
        Sesi_ID: h.sesiId,
        Tanggal_Operasional: h.tanggalOperasional,
        Shift: h.shift,
        Petugas: h.petugas,
        Note: h.note,
        Jumlah_Kritis: h.jumlahKritis,
        Jumlah_Hampir_Habis: h.jumlahHampirHabis,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 400 }
    );
  }
});
