// app/api/laporan/[laporanId]/status-wa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { laporanId } = await params;
  const body = await req.json();
  const { cabangId } = body;
  const result = await callAppsScript('updateStatusKirimWA', cabangId, { laporanId });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
