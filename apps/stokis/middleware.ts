import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  // Exclude SSO callback from CSRF (authenticates via signed HMAC handoff token)
  if (request.nextUrl.pathname.startsWith('/api/auth/sso/callback')) {
    return NextResponse.next();
  }

  // CSRF / Origin protection for state-changing methods
  if (STATE_CHANGING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Validasi origin jika header Origin dikirimkan oleh browser
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

    // Jika client secara eksplisit menyertakan header/cookie CSRF token, validasikan keduanya
    const csrfToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('csrf_token')?.value;

    if (csrfToken && cookieToken && csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: { code: 'CSRF_TOKEN_MISMATCH', message: 'CSRF token tidak cocok' } },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
