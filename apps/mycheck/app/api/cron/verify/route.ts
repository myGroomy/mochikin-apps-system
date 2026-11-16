import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron';
import { getSupabase } from '@/lib/supabase';
import { verifyCurrentAuditChain } from '@/lib/db/audit-verifier';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const { data: branches, error } = await getSupabase()
    .from('branches')
    .select('id,code,status')
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) {
    return NextResponse.json({ ok: false, error: `Supabase branch lookup failed: ${error.message}` }, { status: 500 });
  }

  const results = await Promise.all((branches ?? []).map(async (branch) => {
    try {
      return {
        branchId: branch.code || branch.id,
        ...await verifyCurrentAuditChain(branch.id),
      };
    } catch (verificationError) {
      return {
        branchId: branch.code || branch.id,
        valid: false,
        checked: 0,
        errors: [verificationError instanceof Error ? verificationError.message : 'Gagal memverifikasi audit'],
      };
    }
  }));
  return NextResponse.json({ ok: results.every((result) => result.valid), results });
}
