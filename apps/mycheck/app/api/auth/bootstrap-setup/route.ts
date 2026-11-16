import { NextRequest, NextResponse } from 'next/server';
import { bootstrapSetupSchema } from '@/lib/shared';
import { getSessionFromRequest, createSessionToken, setSessionCookieHeader } from '@/lib/session';
import { findMyCheckIdentity } from '@/lib/supabase-identity';
import { hashPin } from '@/lib/pin';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }
  if (!session.requiresSetup) {
    return NextResponse.json({ error: 'Setup bootstrap tidak diperlukan.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON.' }, { status: 400 });
  }
  const parsed = bootstrapSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const identity = await findMyCheckIdentity(session.personId || session.username);
    if (!identity || identity.role !== 'admin' || identity.status !== 'active') {
      return NextResponse.json({ error: 'Akun bootstrap tidak ditemukan atau bukan admin.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data: duplicate, error: duplicateError } = await supabase
      .from('people')
      .select('id')
      .ilike('username', parsed.data.username.replace(/[\\%_]/g, '\\$&'))
      .neq('id', identity.id)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return NextResponse.json({ error: `Username '${parsed.data.username}' sudah digunakan.` }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('people')
      .update({
        username: parsed.data.username,
        pin_hash: hashPin(parsed.data.newPin),
        must_change_pin: false,
      })
      .eq('id', identity.id)
      .eq('must_change_pin', true)
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return NextResponse.json({ error: 'Akun bootstrap sudah berubah. Silakan login kembali.' }, { status: 409 });
    }

    const token = createSessionToken({
      username: parsed.data.username,
      nama: identity.name,
      role: identity.role,
      cabangId: session.cabangId,
      userId: identity.id,
      personId: identity.id,
      requiresSetup: false,
    });
    const response = NextResponse.json({
      user: {
        username: parsed.data.username,
        nama: identity.name,
        role: identity.role,
        cabangId: session.cabangId,
      },
      requiresSetup: false,
    });
    response.headers.set('Set-Cookie', setSessionCookieHeader(token));
    return response;
  } catch (error) {
    console.error('MyCheck bootstrap setup failed:', error);
    return NextResponse.json({ error: 'Setup akun sementara tidak tersedia.' }, { status: 503 });
  }
}
