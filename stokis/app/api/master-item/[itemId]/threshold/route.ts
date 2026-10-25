// app/api/master-item/[itemId]/threshold/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { itemId } = await params;
  const body = await req.json();
  const { cabangId, threshold } = body;
  const result = await callAppsScript('updateThreshold', cabangId, { itemId, threshold });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });
