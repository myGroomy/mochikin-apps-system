import { NextRequest, NextResponse } from 'next/server';
import { verifyLauncherHandoff, signJWT, mapLauncherRoleToJwtRole } from '@mochikin/shared/sso';

function safeReturnPath(value: string | null): string {
  if (!value || value === '/' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard/me';
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
    const payload = verifyLauncherHandoff(rawToken, undefined, 'MYPERFORMANCE');

    if (!payload) {
      console.warn('Myperformance SSO: invalid or expired token');
      return NextResponse.redirect(new URL('/?sso=invalid', request.url), redirectStatus);
    }

    if (!payload.personId || !payload.branchId) {
      console.warn(`Myperformance SSO: user ${payload.username} has no personId/branchId in Supabase`);
      return NextResponse.redirect(new URL('/?sso=no_supabase_profile', request.url), redirectStatus);
    }

    const secret =
      process.env.LAUNCHER_SSO_SHARED_SECRET ||
      process.env.SESSION_SECRET ||
      '';

    if (!secret || secret.length < 32) {
      console.error('Myperformance SSO: LAUNCHER_SSO_SHARED_SECRET is not configured or < 32 chars');
      return NextResponse.redirect(new URL('/?sso=secret_unconfigured', request.url), redirectStatus);
    }

    const role = mapLauncherRoleToJwtRole(payload.jwtRole || payload.roleName);

    const effectiveBranchId = payload.activeBranchId || payload.branchId;

    const jwtToken = signJWT(
      {
        person_id: payload.personId,
        branch_id: effectiveBranchId,
        role,
        permissions: payload.permissions || [],
      },
      secret,
      8 * 3600
    );

    const targetUrl = new URL(
      safeReturnPath(returnPath),
      request.url
    );

    const response = NextResponse.redirect(targetUrl, redirectStatus);
    response.cookies.set('mochikin_sso', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600,
    });

    if (payload.activeBranchCode || payload.baseBranch) {
      response.cookies.set('mochikin_active_branch_code', payload.activeBranchCode || payload.baseBranch, {
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
  } catch (error) {
    console.error('Myperformance SSO callback exception:', error);
    return NextResponse.redirect(new URL('/?sso=error', request.url), redirectStatus);
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
