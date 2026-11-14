// app/api/so/[laporanId]/xlsx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { generateXlsxReport } from '@/lib/domain/xlsx-report';

export const POST = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const body = await req.json();
  const { items, cabangId, cabangNama, cabangKode, tanggalOperasional, shift, petugas, previousSOInfo, note } = body;

  if (!cabangId || typeof cabangId !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabangId wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  try {
    const xlsxInput = {
      laporanId,
      cabangNama: cabangNama || cabangId,
      cabangKode: cabangKode || cabangId,
      tanggalOperasional,
      shift,
      petugas,
      items: Array.isArray(items) ? items : [],
      previousSOInfo,
      note,
    };

    const { buffer, fileName } = await generateXlsxReport(xlsxInput);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghasilkan file Excel';
    console.error('[XLSX] Generation error:', err);
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});
