import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { userId } = await params;
  const body = await req.json();

  // Toggle status aktif (send live only `{ aktif }`)
  if (Object.prototype.hasOwnProperty.call(body, 'aktif') && Object.keys(body).length === 1) {
    const result = await callAppsScript('setUserActive', '', { userId, aktif: body.aktif });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  const result = await callAppsScript('updateUser', '', { userId, ...body });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { userId } = await params;
  const result = await callAppsScript('deleteUser', '', { userId });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}, { requiredRole: 'admin' });
