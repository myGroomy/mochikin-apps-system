import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { createSsoHandoffToken } from '@/lib/sso';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const portalUrl =
    request.cookies.get('mochikin_portal_url')?.value ||
    process.env.NEXT_PUBLIC_SERVICE_URL ||
    process.env.NEXT_PUBLIC_LAUNCHER_URL ||
    'http://localhost:3000';

  const secret = process.env.LAUNCHER_SSO_SHARED_SECRET || process.env.SESSION_SECRET;

  if (session && secret && secret.length >= 32) {
    try {
      const token = createSsoHandoffToken(
        {
          employeeId: session.username,
          username: session.username,
          employeeName: session.nama,
          roleName: session.role,
          baseBranch: session.cabangId,
          jwtRole: session.role,
        },
        'SERVICES',
        secret,
        60
      );

      const target = new URL('/api/auth/sso/callback', portalUrl);
      target.searchParams.set('token', token);
      target.searchParams.set('returnPath', '/');
      return NextResponse.redirect(target);
    } catch (err) {
      console.warn('Failed to sign return SSO token:', err);
    }
  }

  return NextResponse.redirect(new URL('/', portalUrl));
}
