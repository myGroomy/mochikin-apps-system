import { NextRequest, NextResponse } from 'next/server';
import { readSheetDataFresh, sheetToObjects } from '@/lib/google/sheets';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';
import { verifyLauncherHandoff } from '@mochikin/shared/sso';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
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

    const registryId = process.env.REGISTRY_SPREADSHEET_ID;
    if (!registryId) {
      console.error('REGISTRY_SPREADSHEET_ID is not configured');
      return NextResponse.redirect(new URL('/login?sso=unconfigured', request.url), redirectStatus);
    }

    const { headers, rows } = await readSheetDataFresh(registryId, 'Users');
    const users = sheetToObjects(headers, rows) as Record<string, string>[];

    const username = payload.username.trim().toLowerCase();
    const user = users.find(
      (u) => String(u['Username'] ?? '').trim().toLowerCase() === username
    );

    // User must exist in mycheck's Users sheet
    if (!user) {
      console.warn(`SSO access rejected: user ${payload.username} not found in mycheck Users sheet`);
      return NextResponse.redirect(new URL('/login?sso=unknown_user', request.url), redirectStatus);
    }

    // User must be active
    if (!isAktif(user['Aktif'])) {
      console.warn(`SSO access rejected: user ${payload.username} is inactive in mycheck`);
      return NextResponse.redirect(new URL('/login?sso=inactive', request.url), redirectStatus);
    }

    const role = String(user['Role'] ?? 'petugas').toLowerCase() === 'admin' ? 'admin' : 'petugas';
    const token = createSessionToken({
      username: String(user['Username']),
      nama: String(user['Nama'] ?? payload.employeeName ?? ''),
      role,
      cabangId: String(user['Cabang_ID'] ?? payload.baseBranch ?? ''),
      userId: String(user['User_ID'] ?? ''),
      requiresSetup: false,
    });

    const targetUrl = new URL(safeReturnPath(returnPath), request.url);
    const response = NextResponse.redirect(targetUrl, redirectStatus);
    response.headers.set('Set-Cookie', setSessionCookieHeader(token));

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
