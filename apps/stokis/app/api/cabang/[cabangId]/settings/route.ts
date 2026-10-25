// app/api/cabang/[cabangId]/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { resolveCabang } from '@/lib/google/registry';
import { getUrutanLaporan, setUrutanLaporan, type UrutanLaporan } from '@/lib/domain/laporan-service';

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { cabangId } = await params;
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const { spreadsheetId } = await resolveCabang(cabangId);
  const urutanLaporan = await getUrutanLaporan(spreadsheetId);
  return NextResponse.json({ success: true, data: { urutanLaporan } });
});

export const PUT = withAuth(async (req: NextRequest, { params }, session) => {
  const { cabangId } = await params;
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const body = await req.json().catch(() => ({}));
  const value = String(body?.urutanLaporan || '');
  const { spreadsheetId } = await resolveCabang(cabangId);
  const urutanLaporan = await setUrutanLaporan(spreadsheetId, value as UrutanLaporan);
  return NextResponse.json({ success: true, data: { urutanLaporan } });
}, { requiredRole: 'admin' });