import { NextRequest, NextResponse } from 'next/server'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function middleware(request: NextRequest) {
  if (!STATE_CHANGING_METHODS.has(request.method)) return NextResponse.next()

  const csrfToken = request.headers.get('x-csrf-token')
  const cookieToken = request.cookies.get('csrf_token')?.value

  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return NextResponse.json({ error: 'CSRF token diperlukan' }, { status: 403 })
  }

  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
