import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Exclude SSO callback or login from CSRF if applicable
  if (
    request.nextUrl.pathname.startsWith('/api/auth/sso/callback') ||
    request.nextUrl.pathname.startsWith('/api/auth/login')
  ) {
    return response;
  }

  // CSRF protection for state-changing methods
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('csrf_token')?.value;

    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: { code: 'CSRF_TOKEN_REQUIRED', message: 'CSRF token diperlukan' } },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
