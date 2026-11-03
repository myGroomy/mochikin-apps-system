import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  // Exclude SSO callback or login from CSRF if applicable
  if (
    request.nextUrl.pathname.startsWith('/api/auth/sso/callback') ||
    request.nextUrl.pathname.startsWith('/api/auth/login')
  ) {
    return NextResponse.next();
  }

  // Lightweight origin check for state-changing requests.
  // (The previous double-submit CSRF token check was non-functional because
  //  no CSRF token was ever issued, which blocked every mutation in production.)
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { success: false, message: 'Origin request tidak valid.' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
