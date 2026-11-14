import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/sessionServer';
import { createSsoHandoffToken } from '@/lib/sso';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const portalUrl =
    request.cookies.get('mochikin_portal_url')?.value ||
    process.env.NEXT_PUBLIC_SERVICE_URL ||
    process.env.NEXT_PUBLIC_LAUNCHER_URL ||
    'http://localhost:3000';

  const secret = process.env.LAUNCHER_SSO_SHARED_SECRET || process.env.SESSION_SECRET;

  if (user && secret && secret.length >= 32) {
    try {
      const token = createSsoHandoffToken(
        {
          employeeId: user.id || user.username,
          username: user.username,
          employeeName: user.display_name,
          roleName: user.role,
          baseBranch: user.branch,
          jwtRole: user.role,
          activeBranchId: request.cookies.get('mochikin_active_branch_id')?.value,
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
      target.searchParams.set('token', token);
      target.searchParams.set('returnPath', '/');
      return NextResponse.redirect(target);
    } catch (err) {
      console.warn('Failed to sign return SSO token:', err);
    }
  }

  return NextResponse.redirect(new URL('/', portalUrl));
}
