// app/api/dashboard/mingguan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';
  const dari = searchParams.get('dari') || '';
  const sampai = searchParams.get('sampai') || '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const result = await callAppsScript('getDashboardMingguan', cabangId, { dari, sampai });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });
