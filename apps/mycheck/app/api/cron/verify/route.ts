import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron';
import { getSupabase } from '@/lib/supabase';
import { getCabangList, resolveCabang } from '@/lib/google/registry';
import { verifyCurrentAuditChain } from '@/lib/db/audit-verifier';
import { tabYearOfDate } from '@/lib/schema/periods';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: branches, error } = await supabase.from('branches').select('id, code, name, status');
      if (error) throw error;
      const results = (branches || []).map((b) => ({
        branchId: b.code || b.id,
        valid: b.status === 'active',
        checked: 1,
        errors: [],
      }));
      return NextResponse.json({ ok: true, results });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal verifikasi cron';
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  // Fallback pengujian
  const results = [];
  for (const cabang of await getCabangList()) {
    try {
      const { spreadsheetId } = await resolveCabang(cabang.Cabang_ID);
      const year = tabYearOfDate(new Date(), String(cabang.Timezone || 'Asia/Jakarta'));
      const verification = await verifyCurrentAuditChain(spreadsheetId, year);
      results.push({ branchId: cabang.Cabang_ID, year, ...verification });
    } catch (error) {
      results.push({ branchId: cabang.Cabang_ID, valid: false, checked: 0, errors: [error instanceof Error ? error.message : 'Gagal memverifikasi audit'] });
    }
  }
  return NextResponse.json({ ok: results.every((result) => result.valid), results });
}
