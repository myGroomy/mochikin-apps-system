// app/api/petugas/[petugasId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { petugasId } = await params;
  const body = await req.json();
  const { cabangId, ...payload } = body;
  const result = await callAppsScript('updatePetugas', cabangId, { petugasId, ...payload });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });
