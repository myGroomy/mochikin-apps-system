// app/api/dashboard/harian/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { calculateStatus } from '@/lib/domain/so';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

interface OpnameHeader {
  id: string;
  sesi_id: string;
  shift_type: string;
  petugas: string | null;
  opname_date: string;
}
export const GET = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const { searchParams } = new URL(req.url);
    const cabangId = searchParams.get('cabang') || '';
    const tanggal = searchParams.get('tanggal') || '';

    const guard = assertCabangAccess(session, cabangId);
    if (guard) return guard;

    const supabase = getSupabase();

    let opQuery = supabase
      .from('stokis_opnames')
      .select('id, sesi_id, shift_type, petugas, opname_date');

    if (cabangId) {
      opQuery = isUuid(cabangId)
        ? opQuery.or(`branch_id.eq.${cabangId},branch_code.eq.${cabangId}`)
        : opQuery.eq('branch_code', cabangId);
    }

    if (tanggal) {
      opQuery = opQuery.eq('opname_date', tanggal);
    }

    const { data: opnames, error: opErr } = await opQuery;
    if (opErr) {
      return NextResponse.json({ success: false, error: { message: opErr.message } }, { status: 500 });
    }

    const opnameIds = (opnames || []).map((o) => o.id);
    let lines: Array<Record<string, unknown>> = [];
    if (opnameIds.length > 0) {
      const { data: linesData, error: linesErr } = await supabase
        .from('stokis_opname_lines')
        .select('*')
        .in('opname_id', opnameIds);
      if (linesErr) {
        return NextResponse.json({ success: false, error: { message: linesErr.message } }, { status: 500 });
      }
      lines = (linesData || []) as Array<Record<string, unknown>>;
    }

    const opnameMap = new Map<string, OpnameHeader>((opnames || []).map((o) => [o.id, o as OpnameHeader]));
    const detail: Array<Record<string, unknown>> = [];
    let kritis = 0;
    let hampirHabis = 0;
    let aman = 0;
    let itemsWithSelisih = 0;

    for (const l of lines) {
      const parent = opnameMap.get(String(l.opname_id || ''));
      const total = Number(l.physical_stock ?? 0);
      const threshold = l.threshold != null ? Number(l.threshold) : null;
      const status = calculateStatus(total, threshold);

      if (status === 'Kritis') kritis++;
      else if (status === 'Hampir Habis') hampirHabis++;
      else aman++;

      const diff = Number(l.difference ?? 0);
      if (diff !== 0) itemsWithSelisih++;

      detail.push({
        Transaksi_ID: l.id,
        Sesi_ID: parent?.sesi_id || '',
        Tanggal_Operasional: parent?.opname_date || tanggal,
        Shift: parent?.shift_type || '',
        Item_ID: l.item_code,
        Nama_Barang: l.item_name,
        Area: l.area || '',
        Step1: Number(l.step1 ?? 0),
        Step2: Number(l.step2 ?? 0),
        Total: total,
        Petugas: parent?.petugas || '',
        Keterangan: l.keterangan || '',
        Threshold: threshold,
        Status: status,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tanggal,
        totalTransaksi: detail.length,
        totalItem: detail.length,
        itemsWithSelisih,
        kritis,
        hampirHabis,
        aman,
        detail,
      },
    });
  },
  { requiredRole: 'admin' }
);
