import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Exclude SSO callback from CSRF (authenticates via signed HMAC handoff token)
  if (request.nextUrl.pathname.startsWith('/api/auth/sso/callback')) {
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

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // JWT extraction placeholder for M0
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
