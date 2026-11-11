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
  portalUrlParam: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  try {
    const payload = verifyLauncherHandoff(rawToken, undefined, 'MYCUSTOMER')
    if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url), redirectStatus)

    const r = (payload.roleName || payload.jwtRole || '').toLowerCase()
    const role = (r.includes('admin') || r.includes('super') || r.includes('owner')) ? 'admin' : 'petugas'
    let activeBranchCode = payload.activeBranchCode || payload.baseBranch || ''
    if (activeBranchCode.toUpperCase().includes('BDG')) activeBranchCode = 'BDG'
    else if (activeBranchCode.toUpperCase().includes('CMH')) activeBranchCode = 'CMH'
    const user = {
      id: payload.employeeId,
      username: payload.username,
      display_name: payload.employeeName,
      role,
      branch: activeBranchCode,
    }
    const response = NextResponse.redirect(new URL(safePath(returnPath), request.url), redirectStatus)
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    if (activeBranchCode) {
      response.cookies.set('mochikin_active_branch_code', activeBranchCode, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
    if (payload.activeBranchName) {
      response.cookies.set('mochikin_active_branch_name', payload.activeBranchName, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    if (payload.activeShiftId) {
      response.cookies.set('mochikin_active_shift_id', payload.activeShiftId, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
    if (payload.activeShiftName) {
      response.cookies.set('mochikin_active_shift_name', payload.activeShiftName, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
    if (payload.activeShiftType) {
      response.cookies.set('mochikin_active_shift_type', payload.activeShiftType, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    response.cookies.set('mochikin_sso_mode', 'connected', {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    const detectedPortalUrl = payload.portalUrl || portalUrlParam || request.headers.get('referer')
    if (detectedPortalUrl) {
      try {
        const origin = new URL(detectedPortalUrl).origin
        response.cookies.set('mochikin_portal_url', origin, {
          path: '/',
          maxAge: 30 * 24 * 3600,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      } catch {
        // ignore
      }
    }

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
  const portalUrl = formData?.get('portalUrl')?.toString() || null
  return handleCallback(rawToken, returnPath, portalUrl, request, 303)
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token')
  const returnPath = request.nextUrl.searchParams.get('returnPath')
  const portalUrl = request.nextUrl.searchParams.get('portalUrl')
  return handleCallback(rawToken, returnPath, portalUrl, request, 307)
}
