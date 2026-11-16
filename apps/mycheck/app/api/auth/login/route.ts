import { NextRequest, NextResponse } from 'next/server';
import { findMyCheckIdentity } from '@/lib/supabase-identity';
import { verifyPin } from '@/lib/pin';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';

export async function POST(_req: NextRequest) {
  try {
    const body = await _req.json();
    const username = String(body?.username ?? '').trim();
    const pin = String(body?.pin ?? '').trim();

    if (!username || !pin) {
      return NextResponse.json(
        { error: 'Username dan PIN wajib diisi' },
        { status: 400 }
      );
    }

    const user = await findMyCheckIdentity(username);
    if (!user) {
      return NextResponse.json(
        { error: 'Username tidak ditemukan', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Akun Anda nonaktif. Hubungi Admin.', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    if (!user.pinHash || !verifyPin(pin, user.pinHash)) {
      return NextResponse.json(
        { error: 'PIN yang Anda masukkan salah', code: 'WRONG_PIN' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin' && user.branchCodes.length === 0) {
      return NextResponse.json(
        { error: 'Akun belum ditautkan ke cabang aktif.', code: 'BRANCH_MEMBERSHIP_REQUIRED' },
        { status: 403 }
      );
    }

    const token = createSessionToken({
      username: user.username,
      nama: user.name,
      role: user.role,
      cabangId: user.branchCodes.join(','),
      userId: user.id,
      personId: user.id,
      requiresSetup: user.mustChangePin,
    });

    const response = NextResponse.json({
      user: { username: user.username, nama: user.name, role: user.role, cabangId: user.branchCodes.join(',') },
      requiresSetup: user.mustChangePin,
    });
    response.headers.set('Set-Cookie', setSessionCookieHeader(token));
    return response;
  } catch (err: unknown) {
    console.error('MyCheck Supabase login failed:', err);
    return NextResponse.json(
      { error: 'Login sementara tidak tersedia.', code: 'AUTH_UNAVAILABLE' },
      { status: 503 }
    );
  }
}
