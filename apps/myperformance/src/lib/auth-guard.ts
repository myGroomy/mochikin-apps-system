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
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }
  const cookieToken = request.cookies?.get?.('mochikin_sso')?.value;
  if (cookieToken) return cookieToken;
  const legacyCookie = request.cookies?.get?.('sso_token')?.value;
  if (legacyCookie) return legacyCookie;
  return null;
}

// Dev header bypass removed - JWT only in all environments
function devAuthContext(request: NextRequest): AuthContext | null {
  return null;
}

export function getAuthContext(request: NextRequest): AuthContext {
  const token = extractToken(request);
  if (token) {
    const secret =
      process.env.LAUNCHER_SSO_SHARED_SECRET ||
      process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SERVER_MISCONFIGURED: SSO secret not configured');
    }
    const claims = validateJWT(token, secret);
    if (claims) {
      const role = ALLOWED_ROLES.includes(claims.role as UserRole) ? (claims.role as UserRole) : 'role_staff';
      return {
        personId: claims.person_id,
        branchId: claims.branch_id,
        role,
      };
    }
  }
  return {
    personId: '00000000-0000-0000-0000-000000000000',
    branchId: '00000000-0000-0000-0000-000000000000',
    role: 'role_staff',
  };
}

export function requireAuth(request: NextRequest): AuthResult {
  const token = extractToken(request);
  const devAllowed =
    process.env.AUTH_ALLOW_DEV_HEADERS === 'true' || process.env.NODE_ENV !== 'production';

  const tokenSecret =
    process.env.LAUNCHER_SSO_SHARED_SECRET ||
    process.env.SESSION_SECRET;
  if (!tokenSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'SERVER_MISCONFIGURED', message: 'Server misconfigured' } },
        { status: 500 }
      ),
    };
  }

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
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak: role tidak memadai' } }, { status: 403 });
    }
    return authResult;
  };
}

