import { NextRequest, NextResponse } from 'next/server';
import { validateJWT, createSsoHandoffToken } from '@mochikin/shared/sso';

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('mochikin_sso')?.value ||
    request.cookies.get('sso_token')?.value;

  const portalUrl =
    request.cookies.get('mochikin_portal_url')?.value ||
    process.env.NEXT_PUBLIC_SERVICE_URL ||
    process.env.NEXT_PUBLIC_LAUNCHER_URL ||
    'http://localhost:3000';

  const secret = process.env.LAUNCHER_SSO_SHARED_SECRET || process.env.SESSION_SECRET;

  if (token && secret && secret.length >= 32) {
    try {
      const claims = validateJWT(token, secret);
      if (claims) {
        const handoffToken = createSsoHandoffToken(
          {
            personId: claims.person_id,
            branchId: claims.branch_id,
            roleName: claims.role,
            jwtRole: claims.role,
            permissions: claims.permissions || [],
            activeBranchId: request.cookies.get('mochikin_active_branch_id')?.value || claims.branch_id,
            activeBranchCode: request.cookies.get('mochikin_active_branch_code')?.value,
            activeBranchName: request.cookies.get('mochikin_active_branch_name')?.value,
            activeShiftId: request.cookies.get('mochikin_active_shift_id')?.value,
            activeShiftName: request.cookies.get('mochikin_active_shift_name')?.value,
            activeShiftType: request.cookies.get('mochikin_active_shift_type')?.value,
          },
          'SERVICES',
          secret,
          60
        );

        const target = new URL('/api/auth/sso/callback', portalUrl);
        target.searchParams.set('token', handoffToken);
        target.searchParams.set('returnPath', '/');
        return NextResponse.redirect(target);
      }
    } catch (err) {
      console.warn('Failed to sign return SSO token:', err);
    }
  }

  return NextResponse.redirect(new URL('/', portalUrl));
}
