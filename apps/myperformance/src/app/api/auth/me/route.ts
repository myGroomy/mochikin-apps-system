import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { normalizeRole } from '@/lib/roles';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/auth/me
 *
 * Single source of truth for the client shell. Returns the role resolved from
 * the launcher SSO cookie/JWT — never from a query string the browser controls.
 *
 * An unauthenticated visitor gets `authenticated: false` with a staff-shaped
 * payload so the UI can render a read-only state plus a "masuk lewat Launcher"
 * call to action instead of a blank screen.
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (!authResult.ok) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      personId: null,
      branchId: null,
      role: 'role_staff',
      name: null,
      branchName: null,
    });
  }

  const { personId, branchId, role } = authResult.auth;
  let name: string | null = null;
  let branchName: string | null = null;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const [{ data: person }, { data: branch }] = await Promise.all([
        supabase.from('people').select('name').eq('id', personId).maybeSingle(),
        supabase.from('branches').select('name').eq('id', branchId).maybeSingle(),
      ]);
      name = person?.name ?? null;
      branchName = branch?.name ?? null;
    } catch {
      // Identity is already verified; profile enrichment is best-effort.
    }
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    personId,
    branchId,
    role: normalizeRole(role),
    name,
    branchName,
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
