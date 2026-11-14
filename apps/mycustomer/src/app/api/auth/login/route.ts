import { NextRequest, NextResponse } from 'next/server'
import { scryptSync, timingSafeEqual } from 'node:crypto'
import { getSupabase } from '@/lib/supabase'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/sessionServer'
import { checkRateLimit } from '@/lib/rateLimit'

function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash) return false
  if (!storedHash.includes('$')) return storedHash === pin
  const [salt, expected] = storedHash.split('$')
  if (!salt || !expected) return false
  const actual = scryptSync(pin, salt, 32).toString('hex')
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, { status: 429 })
    }
    const { username, pin } = await request.json()
    if (typeof username !== 'string' || typeof pin !== 'string' || !username.trim() || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Username dan PIN 6 digit tidak valid' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: user, error: userErr } = await supabase
      .from('people')
      .select('id, username, name, role, pin_hash, branch_id, branches(code)')
      .ilike('username', username.trim())
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle()

    if (userErr || !user || !user.pin_hash || !verifyPin(pin, user.pin_hash)) {
      return NextResponse.json({ error: 'Username atau PIN salah' }, { status: 401 })
    }

    const branchInfo = Array.isArray(user.branches)
      ? (user.branches[0] as { code?: string } | undefined)
      : (user.branches as { code?: string } | undefined)
    const branchCode = branchInfo?.code || 'CBG01BDG'

    const sessionUser = {
      id: user.id,
      username: user.username || username,
      display_name: user.name || 'User',
      role: user.role,
      branch: branchCode,
    }

    const responseBody = NextResponse.json({ user: sessionUser })
    responseBody.cookies.set(SESSION_COOKIE_NAME, createSessionToken(sessionUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return responseBody
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
