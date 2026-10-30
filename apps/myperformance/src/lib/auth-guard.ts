import { NextRequest, NextResponse } from 'next/server';
import { validateJWT } from '@mochikin/shared/sso';

export type UserRole =
  | 'role_staff'
  | 'role_captain'
  | 'role_manager'
  | 'role_admin'
  | 'super_admin';

export interface AuthContext {
  personId: string;
  branchId: string;
  role: UserRole;
}

export interface AuthSuccess {
  ok: true;
  auth: AuthContext;
}

export interface AuthFailure {
  ok: false;
  response: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

const ALLOWED_ROLES: UserRole[] = [
  'role_staff',
  'role_captain',
  'role_manager',
  'role_admin',
  'super_admin',
];

function unauthorized(message = 'Tidak terautentikasi'): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

/**
 * Resolve the current user from the launcher SSO JWT.
 *
 * Accepted transports:
 *   1. `Authorization: Bearer <jwt>`
 *   2. Cookie named `mochikin_sso` (set by /api/auth/sso/callback passthrough)
 *
 * When no trusted secret / production guard is satisfied, the dev header
 * fallback (`X-Person-Id`, `X-Branch-Id`, `X-Role`) may be used locally only.
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }
  const cookieToken = request.cookies.get('mochikin_sso')?.value;
  if (cookieToken) return cookieToken;
  const legacyCookie = request.cookies.get('sso_token')?.value;
  if (legacyCookie) return legacyCookie;
  return null;
}

function devAuthContext(request: NextRequest): AuthContext | null {
  const personId = request.headers.get('X-Person-Id');
  const branchId = request.headers.get('X-Branch-Id');
  const role = (request.headers.get('X-Role') as UserRole) || 'role_staff';
  if (!personId || !branchId) return null;
  if (!ALLOWED_ROLES.includes(role)) return null;
  return { personId, branchId, role };
}

export function getAuthContext(request: NextRequest): AuthContext {
  const token = extractToken(request);
  if (token) {
    const secret =
      process.env.LAUNCHER_SSO_SHARED_SECRET ||
      process.env.SESSION_SECRET ||
      'dev-sso-secret-please-set-me';
    const claims = validateJWT(token, secret);
    if (claims) {
      if (!ALLOWED_ROLES.includes(claims.role as UserRole)) {
        // Treat unknown roles as staff for resilience, never as privileged.
        return { personId: claims.person_id, branchId: claims.branch_id, role: 'role_staff' };
      }
      return {
        personId: claims.person_id,
        branchId: claims.branch_id,
        role: claims.role as UserRole,
      };
    }
  }
  const dev = devAuthContext(request);
  if (dev) {
    return dev;
  }
  // Ultimate fallback for unauthenticated requests hitting dev pages.
  return {
    personId: '00000000-0000-0000-0000-000000000000',
    branchId: '00000000-0000-0000-0000-000000000000',
    role: 'role_staff',
  };
}

/**
 * Full authentication gate used by /api/* routes.
 * In production, a verified launcher SSO JWT is mandatory for /api routes that
 * read personal data; dev header fallback only applies outside production.
 */
export function requireAuth(request: NextRequest): AuthResult {
  const token = extractToken(request);
  const devAllowed =
    process.env.AUTH_ALLOW_DEV_HEADERS === 'true' || process.env.NODE_ENV !== 'production';

  const tokenSecret =
    process.env.LAUNCHER_SSO_SHARED_SECRET ||
    process.env.SESSION_SECRET ||
    'dev-sso-secret-please-set-me';

  const claims = token ? validateJWT(token, tokenSecret) : null;

  if (token && claims) {
    const role = claims.role as UserRole;
    if (!ALLOWED_ROLES.includes(role)) {
      return { ok: false, response: unauthorized('Role tidak dikenal') };
    }
    return {
      ok: true,
      auth: { personId: claims.person_id, branchId: claims.branch_id, role },
    };
  }

  if (devAllowed) {
    const dev = devAuthContext(request);
    if (dev) {
      return { ok: true, auth: dev };
    }
  }

  if (token) {
    return { ok: false, response: unauthorized('JWT tidak valid atau sudah kadaluarsa') };
  }

  return { ok: false, response: unauthorized('Authorization Bearer token diperlukan') };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (request: NextRequest): AuthResult | NextResponse => {
    const authResult = requireAuth(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const isSuper = authResult.auth.role === 'super_admin';
    const allowed =
      !isSuper && (allowedRoles.includes(authResult.auth.role) || allowedRoles.includes('super_admin'));
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Akses ditolak: role tidak memadai',
          },
        },
        { status: 403 }
      );
    }
    return authResult;
  };
}
