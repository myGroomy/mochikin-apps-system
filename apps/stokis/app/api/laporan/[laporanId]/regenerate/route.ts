// Regenerate XLSX tidak perlu GAS - file dihasilkan on-the-fly via xlsx-file route.
// Route ini hanya konfirmasi bahwa data tersedia di DB.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getOpnameDetailFromDb } from '@/lib/domain/stokis-repository';

export const POST = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const body = await req.json().catch(() => ({}));
  const cabangId = typeof body?.cabangId === 'string' ? body.cabangId : '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const detail = await getOpnameDetailFromDb(laporanId);
  if (!detail) {
    return NextResponse.json(
      { success: false, error: { message: `Laporan ${laporanId} tidak ditemukan` } },
      { status: 404 }
    );
  }

  // XLSX on-the-fly tersedia di /api/so/[laporanId]/xlsx-file
  return NextResponse.json({
    success: true,
    data: {
      xlsxUrl: `/api/so/${laporanId}/xlsx-file?cabang=${encodeURIComponent(cabangId)}`,
      message: 'File XLSX dapat diunduh langsung tanpa regenerasi',
    },
  });
});
