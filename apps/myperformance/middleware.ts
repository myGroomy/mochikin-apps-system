import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Exclude SSO callback from CSRF (authenticates via signed HMAC handoff token)
  if (request.nextUrl.pathname.startsWith('/api/auth/sso/callback')) {
    return response;
  }

  // CSRF / Origin protection for state-changing methods
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (host && originUrl.host !== host && origin !== request.nextUrl.origin) {
          return NextResponse.json(
            { error: { code: 'INVALID_ORIGIN', message: 'Origin request tidak valid' } },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: { code: 'INVALID_ORIGIN', message: 'Origin request tidak valid' } },
          { status: 403 }
        );
      }
    }

    const csrfToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('csrf_token')?.value;

    if (csrfToken && cookieToken && csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: { code: 'CSRF_TOKEN_MISMATCH', message: 'CSRF token tidak cocok' } },
        { status: 403 }
      );
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // JWT extraction placeholder for M0
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
