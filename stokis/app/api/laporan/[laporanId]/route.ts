// app/api/laporan/[laporanId]/route.ts
// GET: ambil metadata satu laporan (dipakai halaman edit laporan).
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { ApiError } from '@/lib/domain/errors';
import { getLaporanById } from '@/lib/domain/laporan-service';

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
    const laporan = await getLaporanById(cabangId, laporanId);
    if (!laporan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Laporan ' + laporanId + ' tidak ditemukan' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: laporan });
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : new ApiError('internal_error', err instanceof Error ? err.message : 'Terjadi kesalahan');
    return NextResponse.json(
      { success: false, error: { code: apiErr.code, message: apiErr.message } },
      { status: 400 }
    );
  }
});