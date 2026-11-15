// app/api/laporan/[laporanId]/edit/route.ts
// Edit existing SO report: update items, regenerate XLSX in-memory, save payload in DB.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { generateXlsxReport, type XlsxItem } from '@/lib/domain/xlsx-report';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function canEditLaporan(
  session: { role: string; username?: string; nama?: string },
  petugas: unknown
): boolean {
  if (session.role === 'admin') return true;
  const owner = String(petugas || '').trim().toLowerCase();
  if (!owner) return false;
  return [session.nama, session.username]
    .filter(Boolean)
    .some((value) => String(value).trim().toLowerCase() === owner);
}

export const GET = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const cabangId = req.nextUrl.searchParams.get('cabang') || '';
  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabang wajib disertakan' } },
      { status: 400 }
    );
  }
  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;
  return NextResponse.json({ success: true, data: [] });
});

export const POST = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cabangId = typeof body.cabangId === 'string' ? body.cabangId.trim() : '';
  const items = body.items as Array<{
    itemId: string;
    step1?: number;
    step2?: number;
    keterangan?: string;
    statusIsi?: string;
    tglRefill?: string;
    tglPakai?: string;
    tglKedaluwarsa?: string;
  }> | undefined;

  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabangId wajib disertakan' } },
      { status: 400 }
    );
  }
  if (!items || items.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'ITEMS_REQUIRED', message: 'items wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const supabase = getSupabase();

  // 1. Ambil opname berdasarkan sesi_id atau id
  const opQuery = isUuid(laporanId)
    ? supabase.from('stokis_opnames').select('*').or(`id.eq.${laporanId},sesi_id.eq.${laporanId}`).maybeSingle()
    : supabase.from('stokis_opnames').select('*').eq('sesi_id', laporanId).maybeSingle();

  const { data: opname, error: opErr } = await opQuery;
  if (opErr || !opname) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Laporan ${laporanId} tidak ditemukan` } },
      { status: 404 }
    );
  }

  if (!canEditLaporan(session, opname.petugas)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Laporan hanya dapat diedit oleh petugas pembuat SO atau admin' } },
      { status: 403 }
    );
  }

  // 2. Update lines di stokis_opname_lines
  for (const it of items) {
    const s1 = it.step1 != null ? Number(it.step1) : null;
    const s2 = it.step2 != null ? Number(it.step2) : null;
    const total = (s1 ?? 0) + (s2 ?? 0);

    await supabase
      .from('stokis_opname_lines')
      .update({
        step1: s1,
        step2: s2,
        physical_stock: total,
        keterangan: it.keterangan ?? null,
        status_isi: it.statusIsi ?? null,
        tgl_refill: it.tglRefill ?? null,
        tgl_pakai: it.tglPakai ?? null,
      })
      .eq('opname_id', opname.id)
      .eq('item_code', it.itemId);
  }

  // 3. Ambil data baris terbaru untuk regenerate XLSX
  const { data: updatedLines } = await supabase
    .from('stokis_opname_lines')
    .select('*')
    .eq('opname_id', opname.id);

  const xlsxItems: XlsxItem[] = (updatedLines || []).map((l) => ({
    itemId: l.item_code,
    namaBarang: l.item_name,
    area: l.area || 'Kitchen',
    satuan: l.unit,
    threshold: l.threshold != null ? Number(l.threshold) : undefined,
    step1: Number(l.step1 || 0),
    step2: Number(l.step2 || 0),
    keterangan: l.keterangan || '',
    statusIsi: (['Penuh', 'Dipakai', 'Habis'].includes(String(l.status_isi)) ? (l.status_isi as 'Penuh' | 'Dipakai' | 'Habis') : '') || '',
    tglRefill: l.tgl_refill || '',
    tglPakai: l.tgl_pakai || '',
  }));

  const { buffer, fileName } = await generateXlsxReport({
    laporanId: opname.sesi_id || laporanId,
    cabangNama: opname.branch_code || cabangId,
    cabangKode: opname.branch_code || cabangId,
    tanggalOperasional: opname.opname_date,
    shift: opname.shift_type,
    petugas: opname.petugas || '',
    items: xlsxItems,
    note: opname.notes || '',
  });

  // 4. Simpan ke stokis_opnames.xlsx_payload
  await supabase
    .from('stokis_opnames')
    .update({
      xlsx_payload: {
        fileName,
        updatedAt: new Date().toISOString(),
        items: xlsxItems,
        bufferBase64: buffer.toString('base64'),
      },
    })
    .eq('id', opname.id);

  return NextResponse.json({
    success: true,
    data: {
      laporanId,
    },
  });
});
