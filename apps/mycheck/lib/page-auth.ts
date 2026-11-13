// lib/page-auth.ts
// Auth untuk Server Component (page). Cermin dari `lib/api-auth.ts` yang
// dipakai API route, tapi membaca cookie lewat `cookies()` dari next/headers.
//
// Bentuk AuthContext sengaja sama dengan versi lama supaya halaman yang
// sudah ada tidak perlu banyak diubah.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from './session';

// Nama cookie harus sama dengan yang dipakai lib/session.ts
const COOKIE_NAME = 'mycheck_session';

export interface AuthContext {
  user: {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'petugas';
    isActive: boolean;
    requiresSetup: boolean;
    personId?: string;
  };
  branchIds: string[];
  cabangId: string;
  requiresSetup: boolean;
}

/** Daftar cabang yang boleh diakses user. Admin → '*' (seluruh cabang aktif). */
function resolveBranchIds(
  role: 'admin' | 'petugas',
  cabangId: string
): string[] {
  if (role === 'admin') return ['*'];
  return cabangId
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}

function sessionToContext(session: NonNullable<Awaited<ReturnType<typeof readSession>>>): AuthContext {
  return {
    user: {
      id: session.username,
      name: session.nama,
      username: session.username,
      role: session.role,
      isActive: true,
      requiresSetup: Boolean(session.requiresSetup),
      personId: session.personId,
    },
    branchIds: resolveBranchIds(session.role, session.cabangId),
    cabangId: session.cabangId,
    requiresSetup: Boolean(session.requiresSetup),
  };
}

/** Sesi wajib ada; kalau tidak, redirect ke /login. */
export async function requireUser(): Promise<AuthContext> {
  const session = await readSession();
  if (!session) redirect('/login');
  if (session.requiresSetup) redirect('/setup-akun');
  return sessionToContext(session);
}

/** Sesi wajib ada dan berperan admin. */
export async function requireAdmin(): Promise<AuthContext> {
  const session = await readSession();
  if (!session) redirect('/login');
  if (session.requiresSetup) redirect('/setup-akun');
  if (session.role !== 'admin') redirect('/');
  return sessionToContext(session);
}

/** Sesi opsional return null bila tidak login (tanpa redirect). */
export async function getUser(): Promise<AuthContext | null> {
  const session = await readSession();
  return session ? sessionToContext(session) : null;
}
