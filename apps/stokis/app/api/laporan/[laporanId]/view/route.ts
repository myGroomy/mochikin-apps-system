// app/api/laporan/[laporanId]/view/route.ts
// GET: view model laporan (meta + scoreCards + areaGroups) untuk halaman viewer.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { ApiError } from '@/lib/domain/errors';
import { buildLaporanView } from '@/lib/domain/laporan-view';

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
    const data = await buildLaporanView(cabangId, laporanId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : new ApiError('internal_error', err instanceof Error ? err.message : 'Terjadi kesalahan');
    const msg = apiErr.message.toLowerCase();
    const notFound = msg.includes('tidak ditemukan') || msg.includes('tidak_ditemukan') || msg.includes('tidak_aktif');
    return NextResponse.json(
      { success: false, error: { code: notFound ? 'NOT_FOUND' : apiErr.code, message: apiErr.message } },
      { status: notFound ? 404 : 400 }
    );
  }
});
