// app/api/cabang/[cabangId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { cabangId } = await params;
  const body = await req.json();
  const result = await callAppsScript('setCabangActive', cabangId, body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });
