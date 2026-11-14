// app/api/laporan/[laporanId]/wa-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getOpnameDetailFromDb } from '@/lib/domain/stokis-repository';

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  try {
    const detail = await getOpnameDetailFromDb(laporanId);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: { message: `Laporan ${laporanId} tidak ditemukan` } },
        { status: 404 }
      );
    }

    const { header } = detail;
    const downloadXlsxUrl = `/api/so/${laporanId}/xlsx-file?cabang=${encodeURIComponent(cabangId)}`;

    const laporan = {
      Laporan_ID: header.laporanId,
      Sesi_ID: header.sesiId,
      Tanggal_Operasional: header.tanggalOperasional,
      Shift: header.shift,
      Petugas: header.petugas,
      Catatan: header.note,
      Jumlah_Kritis: header.jumlahKritis,
      Jumlah_Hampir_Habis: header.jumlahHampirHabis,
      Link_XLSX: downloadXlsxUrl,
      Status_Kirim_WA: 'Belum Dikirim',
    };

    return NextResponse.json({
      success: true,
      data: {
        laporan,
        shareUrl: downloadXlsxUrl,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat link laporan';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});
