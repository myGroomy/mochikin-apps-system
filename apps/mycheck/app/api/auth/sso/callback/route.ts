import { NextRequest, NextResponse } from 'next/server';
import { findMyCheckIdentity, getActiveBranch, getActiveBranchCodes } from '@/lib/supabase-identity';
import { createSessionToken } from '@/lib/session';
import { verifyLauncherHandoff } from '@mochikin/shared/sso';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveDestination(value: string | null, role: 'admin' | 'petugas'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value === '/') {
    return role === 'admin' ? '/admin' : '/daftar-shift';
  }
  return value.slice(0, 500);
}

async function handleCallback(
  rawToken: string | null,
  returnPath: string | null,
  portalUrlParam: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  try {
    const payload = verifyLauncherHandoff(rawToken, undefined, 'MYCHECK');
    if (!payload) {
      return NextResponse.redirect(new URL('/login?sso=invalid', request.url), redirectStatus);
    }

    const identity = await findMyCheckIdentity(
      payload.personId && UUID_PATTERN.test(payload.personId) ? payload.personId : payload.username
    );
    if (!identity || identity.status !== 'active') {
      return NextResponse.redirect(new URL('/login?sso=inactive', request.url), redirectStatus);
    }
    const role = identity.role;
    const employeeName = identity.name || payload.employeeName || payload.username;
    const requestedBranch = String(payload.activeBranchCode || payload.baseBranch || '').trim();
    const requestedBranchCode = requestedBranch || identity.branchCodes[0] || (role === 'admin' ? (await getActiveBranchCodes())[0] : '');
    if (!requestedBranchCode) {
      return NextResponse.redirect(new URL('/login?sso=branch', request.url), redirectStatus);
    }
    const branch = await getActiveBranch(requestedBranchCode);
    if (!branch || (role !== 'admin' && !identity.branchCodes.includes(branch.code))) {
      return NextResponse.redirect(new URL('/login?sso=branch', request.url), redirectStatus);
    }
    const activeBranch = branch.code;
    const effectivePersonId = identity.id;
    const token = createSessionToken({
      username: identity.username,
      nama: employeeName,
      role,
      cabangId: activeBranch,
      userId: identity.id,
      personId: identity.id,
      requiresSetup: identity.mustChangePin,
    });

    const targetUrl = new URL(identity.mustChangePin ? '/setup-akun' : resolveDestination(returnPath, role), request.url);
    const response = NextResponse.redirect(targetUrl, redirectStatus);
    response.cookies.set('mycheck_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Also persist central active branch context in accessible cookies
    response.cookies.set('mochikin_active_branch_code', activeBranch, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.set('mochikin_active_branch_id', branch.id, {
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    // effectivePersonId already resolved above
    if (effectivePersonId) {
      response.cookies.set('mochikin_person_id', String(effectivePersonId), {
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
        // invalid URL ignored
      }
    }

    return response;
  } catch (error) {
    console.error('SSO callback error in mycheck:', error);
    return NextResponse.redirect(new URL('/login?sso=error', request.url), redirectStatus);
  }
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
