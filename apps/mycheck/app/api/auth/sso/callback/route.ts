import { NextRequest, NextResponse } from 'next/server';
import { readSheetDataFresh, sheetToObjects } from '@/lib/google/sheets';
import { createSessionToken } from '@/lib/session';
import { verifyLauncherHandoff } from '@mochikin/shared/sso';

function resolveDestination(value: string | null, role: 'admin' | 'petugas'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value === '/') {
    return role === 'admin' ? '/admin' : '/daftar-shift';
  }
  return value.slice(0, 500);
}

const isAktif = (v: unknown) =>
  v === true ||
  v === 'true' ||
  v === 'TRUE' ||
  v === 'True' ||
  v === 'yes' ||
  v === 'YES' ||
  v === 'Yes' ||
  v === 'ya' ||
  v === 'YA' ||
  v === '1' ||
  v === 1;

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

    let role: 'admin' | 'petugas' = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'petugas';
    let employeeName = payload.employeeName || payload.username;
    let userId = payload.employeeId || payload.personId || payload.username;
    let activeBranch = String(payload.activeBranchCode || payload.baseBranch || 'BJ01').trim();

    const registryId = process.env.REGISTRY_SPREADSHEET_ID;
    if (registryId) {
      try {
        const { headers, rows } = await readSheetDataFresh(registryId, 'Users');
        const users = sheetToObjects(headers, rows) as Record<string, string>[];
        const username = payload.username.trim().toLowerCase();
        const user = users.find(
          (u) => String(u['Username'] ?? '').trim().toLowerCase() === username
        );

        if (user) {
          if (!isAktif(user['Aktif'])) {
            console.warn(`SSO access rejected: user ${payload.username} is inactive in mycheck`);
            return NextResponse.redirect(new URL('/login?sso=inactive', request.url), redirectStatus);
          }
          if (String(user['Role'] ?? '').toLowerCase() === 'admin') {
            role = 'admin';
          }
          if (user['Nama']) employeeName = String(user['Nama']);
          if (user['User_ID']) userId = String(user['User_ID']);
          if (!payload.activeBranchCode && user['Cabang_ID']) {
            activeBranch = String(user['Cabang_ID']).trim();
          }
        }
      } catch (sheetErr) {
        console.warn('Could not read Users sheet in MyCheck, continuing with validated SSO session:', sheetErr);
      }
    }

    const token = createSessionToken({
      username: payload.username,
      nama: employeeName,
      role,
      cabangId: activeBranch,
      userId,
      requiresSetup: false,
    });

    const targetUrl = new URL(resolveDestination(returnPath, role), request.url);
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
    const effectiveBranchId = payload.activeBranchId || payload.branchId;
    if (effectiveBranchId) {
      response.cookies.set('mochikin_active_branch_id', String(effectiveBranchId), {
        path: '/',
        maxAge: 30 * 24 * 3600,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    const effectivePersonId = payload.personId || payload.employeeId;
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
