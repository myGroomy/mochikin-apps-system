// app/api/so/[laporanId]/xlsx-file/route.ts
// Download file XLSX laporan on-the-fly dengan ExcelJS tanpa ketergantungan Google Drive.
import { NextRequest, NextResponse } from 'next/server';
import { assertCabangAccess, withAuth } from '@/lib/auth';
import { generateXlsxReport, type XlsxItem } from '@/lib/domain/xlsx-report';
import { getOpnameDetailFromDb } from '@/lib/domain/stokis-repository';

export const GET = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ laporanId: string }> },
  session
) => {
  const { laporanId } = await context.params;
  const cabangId = req.nextUrl?.searchParams.get('cabang') || '';

  if (!laporanId) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'laporanId wajib disertakan' } }, { status: 404 });
  }

  const accessError = cabangId ? assertCabangAccess(session, cabangId) : null;
  if (accessError) return accessError;

  try {
    const detail = await getOpnameDetailFromDb(laporanId);
    if (!detail) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' } }, { status: 404 });
    }

    const { header, items } = detail;
    const xlsxItems: XlsxItem[] = items.map((it) => ({
      itemId: it.itemId,
      namaBarang: it.namaBarang,
      area: it.area,
      satuan: it.satuan,
      threshold: it.threshold,
      step1: it.step1,
      step2: it.step2,
      keterangan: it.keterangan,
      statusIsi: (it.statusIsi as 'Penuh' | 'Dipakai' | 'Habis') || '',
      tglRefill: it.tglRefill,
      tglPakai: it.tglPakai,
    }));

    const { buffer, fileName } = await generateXlsxReport({
      laporanId: header.laporanId,
      cabangNama: header.cabangNama,
      cabangKode: header.cabangId,
      tanggalOperasional: header.tanggalOperasional,
      shift: header.shift,
      petugas: header.petugas,
      items: xlsxItems,
      note: header.note,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghasilkan file Excel';
    console.error('Error generating XLSX file on the fly:', err);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
});
