// app/api/cabang/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  const result = await callAppsScript('getCabangList');
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const result = await callAppsScript('createCabang', undefined, body);
  return NextResponse.json(result, { status: result.success ? 201 : 400 });
}, { requiredRole: 'admin' });
