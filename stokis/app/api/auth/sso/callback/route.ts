import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';
import { verifyLauncherHandoff } from '@/lib/sso';

function safePath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value.slice(0, 500);
}

export async function GET(request: NextRequest) {
  const payload = verifyLauncherHandoff(request.nextUrl.searchParams.get('token'));
  if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url));

  const role = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'petugas';
  const token = createSessionToken({
    username: payload.username,
    nama: payload.employeeName,
    role,
    cabangId: payload.baseBranch,
  });
  const response = NextResponse.redirect(new URL(safePath(request.nextUrl.searchParams.get('returnPath')), request.url));
  response.headers.set('Set-Cookie', setSessionCookieHeader(token));
  return response;
}
