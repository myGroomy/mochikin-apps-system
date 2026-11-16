// app/api/laporan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function fmtDisplayDate(v: unknown): string {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  const [yy, mm, dd] = s.split('-');
  return dd && mm && yy ? `${dd}/${mm}/${yy}` : s;
}

export const GET = withAuth(async (req: NextRequest, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';
  const tanggal = searchParams.get('tanggal') || '';
  const shift = searchParams.get('shift') || '';
  const petugas = searchParams.get('petugas') || '';

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const supabase = getSupabase();
  let query = supabase
    .from('stokis_opnames')
    .select('id, sesi_id, branch_id, branch_code, opname_date, shift_type, status, petugas, submitted_at, wa_sent_at');

  if (cabangId) {
    query = isUuid(cabangId)
      ? query.or(`branch_id.eq.${cabangId},branch_code.eq.${cabangId}`)
      : query.eq('branch_code', cabangId);
  }

  if (tanggal) {
    query = query.eq('opname_date', tanggal);
  }
  if (shift) {
    query = query.ilike('shift_type', shift);
  }
  if (petugas) {
    query = query.ilike('petugas', `%${petugas}%`);
  }

  const { data, error } = await query
    .order('opname_date', { ascending: false })
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  const list = (data || []).map((o) => ({
    Laporan_ID: o.sesi_id,
    Sesi_ID: o.sesi_id,
    Tanggal_Operasional: fmtDisplayDate(o.opname_date),
    Shift: o.shift_type,
    Petugas: o.petugas || '',
    Status: o.status,
    XLSX_Link: `/api/so/${o.sesi_id}/xlsx-file?cabang=${encodeURIComponent(o.branch_code || cabangId)}`,
    Link_XLSX: `/api/so/${o.sesi_id}/xlsx-file?cabang=${encodeURIComponent(o.branch_code || cabangId)}`,
    Waktu_Dibuat: o.submitted_at || '',
    Jumlah_Kritis: 0,
    Jumlah_Hampir_Habis: 0,
    Status_Kirim_WA: o.wa_sent_at ? 'Sent' : '',
  }));

  return NextResponse.json({ success: true, data: list });
});
