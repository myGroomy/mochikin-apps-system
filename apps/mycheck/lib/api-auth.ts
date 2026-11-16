// lib/api-auth.ts
// Adapter auth untuk API routes: withAuth/requireRole/requireBranchAccess
// Bentuk disamakan 100% dengan STOKIS:
//
//   withAuth(handler, { requiredRole?: 'admin' | 'petugas' })
//   handler(req, context, session: SessionData) => Promise<NextResponse>
//
// Respons standar:
//   sukses  : { success: true, data: ... }
//   gagal   : { success: false, error: { code: "...", message: "..." } }

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionData } from './session';
import { findMyCheckIdentity, getActiveBranchCodes } from './supabase-identity';

export interface AuthContext {
  user: {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'petugas';
    isActive: boolean;
    personId?: string;
  };
  branchIds: string[];
  cabangId: string;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext,
  session: SessionData
) => Promise<NextResponse>;

export function withAuth(
  handler: AuthenticatedHandler,
  options?: { requiredRole?: 'admin' | 'petugas' }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Belum terotentikasi. Sesi tidak ditemukan.' } },
        { status: 401 }
      );
    }

    const setupPath = new URL(req.url).pathname;
    if (
      session.requiresSetup &&
      setupPath !== '/api/auth/me' &&
      setupPath !== '/api/auth/logout' &&
      setupPath !== '/api/auth/logout-all'
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'SETUP_REQUIRED', message: 'Setup akun wajib diselesaikan terlebih dahulu.' } },
        { status: 428 }
      );
    }

    let identity;
    let branchIds: string[];
    try {
      identity = await findMyCheckIdentity(session.personId || session.username);
      if (!identity || identity.status !== 'active') {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Akun tidak ditemukan atau sudah dinonaktifkan.' } },
          { status: 401 }
        );
      }
      branchIds = identity.role === 'admin'
        ? await getActiveBranchCodes()
        : identity.branchCodes;
    } catch (error) {
      console.error('MyCheck session authorization failed:', error);
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_UNAVAILABLE', message: 'Otorisasi sementara tidak tersedia.' } },
        { status: 503 }
      );
    }

    if (options?.requiredRole && identity.role !== options.requiredRole && identity.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: `Akses ditolak. Peran ${options.requiredRole} diperlukan.` } },
        { status: 403 }
      );
    }

    const ctx: AuthContext = {
      user: {
        id: identity.id,
        name: identity.name,
        username: identity.username,
        role: identity.role,
        isActive: true,
        personId: identity.id,
      },
      branchIds,
      cabangId: session.cabangId,
    };

    return handler(req, ctx, { ...session, username: identity.username, nama: identity.name, role: identity.role, personId: identity.id });
  };
}

export function requireRole(
  authCtx: AuthContext,
  requiredRole: 'admin' | 'petugas'
): NextResponse | null {
  if (authCtx.user.role !== requiredRole && authCtx.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: `Akses ditolak. Peran ${requiredRole} diperlukan.` } },
      { status: 403 }
    );
  }
  return null;
}

export function requireBranchAccess(
  authCtx: AuthContext,
  branchId: string
): NextResponse | null {
  if (authCtx.user.role === 'admin') return null;
  if (!authCtx.branchIds.includes(branchId)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki akses ke cabang ini.' } },
      { status: 403 }
    );
  }
  return null;
}
