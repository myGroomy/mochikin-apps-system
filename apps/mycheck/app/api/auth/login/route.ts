import { scryptSync, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { readSheetDataFresh, sheetToObjects } from '@/lib/google/sheets';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';

function verifyPin(pin: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.includes('$')) return stored === pin;
  const [salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, 32).toString('hex');
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

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

    // 1. Coba autentikasi via Supabase people table
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: user, error } = await supabase
          .from('people')
          .select('id, username, name, role, pin_hash, status, branch_members(branches(code))')
          .ilike('username', username)
          .is('deleted_at', null)
          .maybeSingle();

        if (!error && user) {
          if (user.status !== 'active') {
            return NextResponse.json(
              { error: 'Akun Anda nonaktif. Hubungi Admin.', code: 'ACCOUNT_INACTIVE' },
              { status: 403 }
            );
          }

          if (user.pin_hash && verifyPin(pin, user.pin_hash)) {
            const role = user.role === 'admin' ? 'admin' : 'petugas';
            const members = Array.isArray(user.branch_members) ? user.branch_members : [];
            const cabangId = members
              .map((m: { branches?: { code?: string }[] | { code?: string } | null }) => {
                if (Array.isArray(m.branches)) return m.branches[0]?.code;
                return (m.branches as { code?: string } | null | undefined)?.code;
              })
              .filter(Boolean)
              .join(',') || '';

            const token = createSessionToken({
              username: user.username || username,
              nama: user.name || '',
              role,
              cabangId,
              userId: user.id,
              requiresSetup: false,
            });

            const response = NextResponse.json({
              user: { username: user.username || username, nama: user.name, role, cabangId },
              requiresSetup: false,
            });
            response.headers.set('Set-Cookie', setSessionCookieHeader(token));
            return response;
          }
        }
      } catch (sbErr) {
        console.warn('⚠️ Supabase login check error:', sbErr);
      }
    }

    // 2. Fallback Google Sheets Registry
    const registryId = process.env.REGISTRY_SPREADSHEET_ID;
    if (!registryId) {
      return NextResponse.json(
        { error: 'Username atau PIN salah', code: 'WRONG_PIN' },
        { status: 401 }
      );
    }

    const { headers, rows } = await readSheetDataFresh(registryId, 'Users');
    const users = sheetToObjects(headers, rows) as Record<string, string>[];

    const user = users.find(
      (u) => String(u['Username'] ?? '').trim().toLowerCase() === username.toLowerCase()
    );

    const isAktif = (v: unknown) =>
      v === true || v === 'true' || v === 'TRUE' || v === 'True' || v === 'yes' || v === 'YES' || v === 'ya' || v === 'YA' || v === '1' || v === 1;

    if (!user) {
      return NextResponse.json(
        { error: 'Username tidak ditemukan', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const storedPin = String(user['PIN'] ?? '').trim();
    const inputPin = pin.trim();
    if (storedPin !== inputPin) {
      return NextResponse.json(
        { error: 'PIN yang Anda masukkan salah', code: 'WRONG_PIN' },
        { status: 401 }
      );
    }

    if (!isAktif(user['Aktif'])) {
      return NextResponse.json(
        { error: 'Akun Anda nonaktif. Hubungi Admin.', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    const role = String(user['Role'] ?? 'petugas').toLowerCase() === 'admin' ? 'admin' : 'petugas';
    const requiresSetup = ['true', 'TRUE', '1', 'yes', 'YES', 'ya', 'YA'].includes(
      String(user['Must_Change_Pin'] ?? '').trim()
    );

    const token = createSessionToken({
      username: String(user['Username']),
      nama: String(user['Nama'] ?? ''),
      role,
      cabangId: String(user['Cabang_ID'] ?? ''),
      userId: String(user['User_ID'] ?? ''),
      requiresSetup,
    });

    const response = NextResponse.json({
      user: { username: user['Username'], nama: user['Nama'], role, cabangId: user['Cabang_ID'] },
      requiresSetup,
    });
    response.headers.set('Set-Cookie', setSessionCookieHeader(token));
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Gagal memproses login: ' + message },
      { status: 500 }
    );
  }
}
