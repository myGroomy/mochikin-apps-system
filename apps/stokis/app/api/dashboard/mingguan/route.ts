// app/api/dashboard/mingguan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { calculateStatus } from '@/lib/domain/so';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

interface OpnameHeader {
  id: string;
  sesi_id: string;
  opname_date: string;
}
export const GET = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const { searchParams } = new URL(req.url);
    const cabangId = searchParams.get('cabang') || '';
    const dari = searchParams.get('dari') || '';
    const sampai = searchParams.get('sampai') || '';

    const guard = assertCabangAccess(session, cabangId);
    if (guard) return guard;

    const supabase = getSupabase();

    let opQuery = supabase
      .from('stokis_opnames')
      .select('id, sesi_id, opname_date');

    if (cabangId) {
      opQuery = isUuid(cabangId)
        ? opQuery.or(`branch_id.eq.${cabangId},branch_code.eq.${cabangId}`)
        : opQuery.eq('branch_code', cabangId);
    }

    if (dari) {
      opQuery = opQuery.gte('opname_date', dari);
    }
    if (sampai) {
      opQuery = opQuery.lte('opname_date', sampai);
    }

    const { data: opnames, error: opErr } = await opQuery;
    if (opErr) {
      return NextResponse.json({ success: false, error: { message: opErr.message } }, { status: 500 });
    }

    const opnameIds = (opnames || []).map((o) => o.id);
    let lines: Array<{ opname_id: string; physical_stock: number | null; threshold: number | null }> = [];
    if (opnameIds.length > 0) {
      const { data: linesData, error: linesErr } = await supabase
        .from('stokis_opname_lines')
        .select('opname_id, physical_stock, threshold')
        .in('opname_id', opnameIds);
      if (linesErr) {
        return NextResponse.json({ success: false, error: { message: linesErr.message } }, { status: 500 });
      }
      lines = (linesData || []) as Array<{ opname_id: string; physical_stock: number | null; threshold: number | null }>;
    }

    const opnameMap = new Map<string, OpnameHeader>((opnames || []).map((o) => [o.id, o as OpnameHeader]));
    const trenPerHari: Record<string, { total: number; kritis: number; hampirHabis: number; aman: number }> = {};

    for (const l of lines) {
      const parent = opnameMap.get(l.opname_id);
      const date = parent?.opname_date || '';
      if (!date) continue;

      if (!trenPerHari[date]) {
        trenPerHari[date] = { total: 0, kritis: 0, hampirHabis: 0, aman: 0 };
      }

      const total = Number(l.physical_stock ?? 0);
      const threshold = l.threshold != null ? Number(l.threshold) : null;
      const status = calculateStatus(total, threshold);

      trenPerHari[date].total += 1;
      if (status === 'Kritis') trenPerHari[date].kritis += 1;
      else if (status === 'Hampir Habis') trenPerHari[date].hampirHabis += 1;
      else trenPerHari[date].aman += 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        dari,
        sampai,
        totalTransaksi: lines.length,
        trenPerHari,
      },
    });
  },
  { requiredRole: 'admin' }
);
