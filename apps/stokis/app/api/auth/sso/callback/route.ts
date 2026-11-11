import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session';
import { verifyLauncherHandoff } from '@/lib/sso';

function safePath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value.slice(0, 500);
}

async function handleCallback(
  rawToken: string | null,
  returnPath: string | null,
  portalUrlParam: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  const payload = verifyLauncherHandoff(rawToken, undefined, 'STOKIS');
  if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url), redirectStatus);

  const role = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'petugas';
  const effectiveBranch = payload.activeBranchCode || payload.baseBranch;
  const token = createSessionToken({
    username: payload.username,
    nama: payload.employeeName,
    role,
    cabangId: effectiveBranch,
  });
  const response = NextResponse.redirect(new URL(safePath(returnPath), request.url), redirectStatus);
  response.cookies.set('stokis_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  if (effectiveBranch) {
    response.cookies.set('mochikin_active_branch_code', effectiveBranch, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  if (payload.activeBranchName) {
    response.cookies.set('mochikin_active_branch_name', payload.activeBranchName, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  if (payload.activeShiftId) {
    response.cookies.set('mochikin_active_shift_id', payload.activeShiftId, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  if (payload.activeShiftName) {
    response.cookies.set('mochikin_active_shift_name', payload.activeShiftName, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  if (payload.activeShiftType) {
    response.cookies.set('mochikin_active_shift_type', payload.activeShiftType, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  response.cookies.set('mochikin_sso_mode', 'connected', {
    path: '/',
    maxAge: 30 * 24 * 3600,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  const detectedPortalUrl = payload.portalUrl || portalUrlParam || request.headers.get('referer');
  if (detectedPortalUrl) {
    try {
      const origin = new URL(detectedPortalUrl).origin;
      response.cookies.set('mochikin_portal_url', origin, {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    } catch {
      // ignore
    }
  }

  return response;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const rawToken = formData?.get('token')?.toString() || null;
  const returnPath = formData?.get('returnPath')?.toString() || null;
  const portalUrl = formData?.get('portalUrl')?.toString() || null;
  return handleCallback(rawToken, returnPath, portalUrl, request, 303);
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token');
  const returnPath = request.nextUrl.searchParams.get('returnPath');
  const portalUrl = request.nextUrl.searchParams.get('portalUrl');
  return handleCallback(rawToken, returnPath, portalUrl, request, 307);
}
