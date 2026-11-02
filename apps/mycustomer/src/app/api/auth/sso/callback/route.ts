import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/sessionServer'
import { verifyLauncherHandoff } from '@/lib/sso'

function safePath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value === '/') return '/app'
  return value.slice(0, 500)
}

async function handleCallback(
  rawToken: string | null,
  returnPath: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  try {
    const payload = verifyLauncherHandoff(rawToken, undefined, 'MYCUSTOMER')
    if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url), redirectStatus)

    const role = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'kasir'
    const user = {
      id: payload.employeeId,
      username: payload.username,
      display_name: payload.employeeName,
      role,
      branch: payload.baseBranch,
    }
    const response = NextResponse.redirect(new URL(safePath(returnPath), request.url), redirectStatus)
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error('SSO callback error:', error)
    return NextResponse.redirect(new URL('/login?sso=unavailable', request.url), redirectStatus)
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null)
  const rawToken = formData?.get('token')?.toString() || null
  const returnPath = formData?.get('returnPath')?.toString() || null
  return handleCallback(rawToken, returnPath, request, 303)
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token')
  const returnPath = request.nextUrl.searchParams.get('returnPath')
  return handleCallback(rawToken, returnPath, request, 307)
}
