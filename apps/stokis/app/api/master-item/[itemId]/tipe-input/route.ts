// app/api/master-item/[itemId]/tipe-input/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, { params }, session) => {
  const { itemId } = await params;
  const body = await req.json();
  const { cabangId, tipeInput } = body;
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;
  const result = await callAppsScript('updateTipeInput', cabangId, { itemId, tipeInput });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
