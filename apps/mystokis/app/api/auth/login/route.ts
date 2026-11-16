import { scryptSync, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { createSessionToken, setSessionCookieHeader } from '@/lib/session';

function verifyPin(pin: string, stored: string): boolean {
  if (!stored) return false;
  // Supabase format: scrypt hash "salt$hex" — fallback plaintext untuk dev seed
  if (!stored.includes('$')) return stored === pin;
  const [salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, 32).toString('hex');
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const { username, pin } = await request.json();
    if (!username || !pin) {
      return NextResponse.json({ success: false, error: { message: 'Username dan PIN wajib diisi' } }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('people')
      .select('id, username, name, role, pin_hash, branch_members(branches(code))')
      .ilike('username', String(username).trim())
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !user || !user.pin_hash || !verifyPin(String(pin).trim(), user.pin_hash)) {
      return NextResponse.json({ success: false, error: { message: 'Username atau PIN salah' } }, { status: 401 });
    }

    // Kumpulkan semua branch codes yang boleh diakses (comma-separated)
    const members = Array.isArray(user.branch_members) ? user.branch_members : [];
    const cabangId = members
      .map((m: { branches?: { code?: string }[] | null }) => (Array.isArray(m.branches) ? m.branches[0]?.code : (m.branches as { code?: string } | null | undefined)?.code))
      .filter(Boolean)
      .join(',') || '';

    const sessionData = {
      username: user.username || String(username).trim(),
      nama: user.name || '',
      role: ['admin', 'role_admin', 'super_admin'].includes(user.role) ? 'admin' as const : 'petugas' as const,
      cabangId,
      personId: user.id,
    };

    const token = createSessionToken(sessionData);
    const response = NextResponse.json({ success: true, data: sessionData });
    response.headers.set('Set-Cookie', setSessionCookieHeader(token));
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { message: 'Gagal memproses login: ' + message } }, { status: 500 });
  }
}
