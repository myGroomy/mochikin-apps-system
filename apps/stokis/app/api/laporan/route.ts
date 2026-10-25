// app/api/laporan/route.ts
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

export const GET = withAuth(async (req: NextRequest, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';
  const tanggal = searchParams.get('tanggal') || '';
  const shift = searchParams.get('shift') || '';
  const petugas = searchParams.get('petugas') || '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const result = await callAppsScript('searchLaporan', cabangId, { tanggal, shift, petugas });
  if (result.success && Array.isArray(result.data)) {
    result.data.forEach((r: Record<string, unknown>) => {
      if (r['Tanggal_Operasional'] != null) {
        r['Tanggal_Operasional'] = fmtDisplayDate(r['Tanggal_Operasional']);
      }
    });
  }
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
