import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';
import { verifyLauncherHandoff } from '@/lib/sso';

function safePath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value.slice(0, 500);
}

async function handleCallback(
  rawToken: string | null,
  returnPath: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  const payload = verifyLauncherHandoff(rawToken, undefined, 'STOKIS');
  if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url), redirectStatus);

  const role = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'petugas';
  const token = createSessionToken({
    username: payload.username,
    nama: payload.employeeName,
    role,
    cabangId: payload.baseBranch,
  });
  const response = NextResponse.redirect(new URL(safePath(returnPath), request.url), redirectStatus);
  response.headers.set('Set-Cookie', setSessionCookieHeader(token));
  return response;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const rawToken = formData?.get('token')?.toString() || null;
  const returnPath = formData?.get('returnPath')?.toString() || null;
  return handleCallback(rawToken, returnPath, request, 303);
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token');
  const returnPath = request.nextUrl.searchParams.get('returnPath');
  return handleCallback(rawToken, returnPath, request, 307);
}
