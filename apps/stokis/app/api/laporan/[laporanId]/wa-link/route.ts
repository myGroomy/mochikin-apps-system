// app/api/laporan/[laporanId]/wa-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { formatDate } from '@/lib/domain/ids';

/** Tampilkan tanggal sebagai DD/MM/YYYY (normalisasi serial number Google Sheets). */
function fmtDisplayDate(v: unknown): string {
  const d = formatDate(v as never);
  if (!d) return String(v ?? '');
  const [yy, mm, dd] = d.split('-');
  return dd && mm && yy ? `${dd}/${mm}/${yy}` : d;
}

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const result = await callAppsScript('getShareWhatsAppLink', cabangId, { laporanId });
  if (result.success && result.data?.laporan) {
    const lap = result.data.laporan;
    if (lap['Tanggal_Operasional'] != null) {
      lap['Tanggal_Operasional'] = fmtDisplayDate(lap['Tanggal_Operasional']);
    }
  }
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
