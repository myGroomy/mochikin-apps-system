// Status WA disimpan ke stokis_opnames.wa_sent_at (bukan GAS lagi).
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { laporanId } = await params;
  const supabase = getSupabase();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(laporanId);
  const { error } = isUuid
    ? await supabase.from('stokis_opnames').update({ wa_sent_at: new Date().toISOString() }).or(`id.eq.${laporanId},sesi_id.eq.${laporanId}`)
    : await supabase.from('stokis_opnames').update({ wa_sent_at: new Date().toISOString() }).eq('sesi_id', laporanId);

  if (error) {
    // Non-critical: log tapi tetap sukses ke frontend
    console.error('[status-wa] update wa_sent_at error:', error.message);
  }

  return NextResponse.json({ success: true });
});
