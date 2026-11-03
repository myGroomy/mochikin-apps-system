// app/api/master-item/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json();
  const { cabangId, updates } = body;

  if (!cabangId || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'bad_request', message: 'cabangId dan updates diperlukan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const result = await callAppsScript('batchUpdate', cabangId, { updates });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
