// app/api/so/[laporanId]/xlsx-file/route.ts
// Sajikan XLSX laporan setelah autentikasi dan pemeriksaan akses cabang.
// Dipakai sebagai link fallback bila upload ke Drive gagal.
import { NextRequest, NextResponse } from 'next/server';
import { assertCabangAccess, withAuth } from '@/lib/auth';
import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, sheetToObjects } from '@/lib/google/sheets';
import { generateXlsxReport, type XlsxItem } from '@/lib/domain/xlsx-report';
import { getUrutanLaporan, getSesiLiveData } from '@/lib/domain/laporan-service';
import { getMasterItems } from '@/lib/domain/master-item-service';
import { parseThreshold } from '@/lib/domain/so';
import { generateXlsxFromTemplate } from '@/lib/google/template-xlsx';

function fmtDateValue(v: unknown): string {
  const d = normalizeDate(v);
  if (!d) return String(v ?? '');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Normalkan serial number Google Sheets / ISO ke Date (origin 25569 = 1970-01-01). */
function normalizeDate(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (/^\d{5,6}$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25569) * 86400000));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const GET = withAuth(async (
  req: NextRequest,
  context: { params: Promise<{ laporanId: string }> },
  session
) => {
  const { laporanId } = await context.params;
  const cabangId = req.nextUrl?.searchParams.get('cabang') || '';

  if (!laporanId) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (!cabangId) {
    return NextResponse.json({ success: false, error: { code: 'CABANG_REQUIRED' } }, { status: 400 });
  }
  const accessError = assertCabangAccess(session, cabangId);
  if (accessError) return accessError;

  let spreadsheetId: string;
  let cabang;
  try {
    const resolved = await resolveCabang(cabangId);
    spreadsheetId = resolved.spreadsheetId;
    cabang = resolved.cabang;
  } catch {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const cabangNama = String(cabang['Nama_Cabang'] || cabangId);
  const cabangKode = cabangId;

  // 1) Header laporan dari Laporan_PDF
  const laporanData = await readSheetData(spreadsheetId, 'Laporan_PDF');
  const laporanRows = sheetToObjects(laporanData.headers, laporanData.rows);
  const laporan = laporanRows.find((r) => String(r['Laporan_ID']) === laporanId);
  if (!laporan) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  // 2) Detail item dari Laporan_SO
  const detailData = await readSheetData(spreadsheetId, 'Laporan_SO');
  const detailRows = sheetToObjects(detailData.headers, detailData.rows);
  const detail = detailRows.filter((r) => String(r['Laporan_ID']) === laporanId);

  if (detail.length === 0) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Detail laporan belum tersedia' } }, { status: 404 });
  }

  const tanggalOperasional = fmtDateValue(laporan['Tanggal_Operasional']);
  const shift = String(laporan['Shift'] || '');
  const petugas = String(laporan['Petugas'] || '');

  // Fallback data live (note + boolean/date) untuk laporan lama yang kolomnya
  // belum tersimpan di Laporan_SO.
  const live = await getSesiLiveData(spreadsheetId, String(laporan['Sesi_ID'] || ''));

  // Fetch master items untuk mendapatkan Tipe_Input
  const masterItems = await getMasterItems(cabangId);
  const tipeInputMap = new Map<string, string>();
  masterItems.forEach((m: any) => { tipeInputMap.set(String(m['Item_ID'] || ''), String(m['Tipe_Input'] || '')); });

  // Build XlsxItem[]
  const items: XlsxItem[] = detail.map((r) => {
    const itemId = String(r['Item_ID'] || '');
    const fb = live.byItemId[itemId] || {};
    return {
      itemId,
      namaBarang: String(r['Nama_Barang'] || ''),
      area: String(r['Area'] || ''),
      satuan: String(r['Satuan'] || ''),
      threshold: parseThreshold(r['Threshold']) ?? undefined,
      tipeInput: tipeInputMap.get(itemId) || '',
      step1: Number(r['Step1']) || 0,
      step2: Number(r['Step2']) || 0,
      keterangan: String(r['Keterangan'] || ''),
      prevStep1: r['Prev_Step1'] != null && String(r['Prev_Step1']) !== '' ? Number(r['Prev_Step1']) : null,
      prevStep2: r['Prev_Step2'] != null && String(r['Prev_Step2']) !== '' ? Number(r['Prev_Step2']) : null,
      prevTotal: r['Prev_Total'] != null && String(r['Prev_Total']) !== '' ? Number(r['Prev_Total']) : null,
      prevKeterangan: String(r['Prev_Keterangan'] || ''),
      statusIsi: (['Penuh', 'Dipakai', 'Habis'].includes(String(r['Status_Isi']))) ? r['Status_Isi'] as 'Penuh' | 'Dipakai' | 'Habis' : (fb.statusIsi || ''),
      tglRefill: String(r['Tgl_Refill'] || fb.tglRefill || ''),
      tglPakai: String(r['Tgl_Pakai'] || fb.tglPakai || ''),
      tglKedaluwarsa: String(r['Tgl_Kedaluwarsa'] || ''),
    };
  });

  const previousSOInfo = {
    tanggal: detail[0]?.['Prev_Tanggal'] ? fmtDateValue(detail[0]['Prev_Tanggal']) : '',
    shift: String(detail[0]?.['Prev_Shift'] || ''),
  };

  const urutanLaporan = await getUrutanLaporan(spreadsheetId);

  // Coba template dulu, fallback ke ExcelJS
  let buffer: Buffer;
  let fileName: string;
  try {
    const templateResult = await generateXlsxFromTemplate({
      laporanId,
      cabangNama,
      cabangKode,
      tanggalOperasional,
      shift,
      petugas,
      items,
      groupMode: urutanLaporan,
      note: detail[0]?.['Note'] ? String(detail[0]['Note']) : live.note,
      previousSOInfo,
    });
    buffer = templateResult.buffer;
    fileName = templateResult.fileName;
  } catch (templateErr) {
    console.warn('[XlsxFile] Template approach gagal, fallback ExcelJS:', templateErr);
    const fallback = await generateXlsxReport({
      laporanId,
      cabangNama,
      cabangKode,
      tanggalOperasional,
      shift,
      petugas,
      items,
      groupMode: urutanLaporan,
      note: detail[0]?.['Note'] ? String(detail[0]['Note']) : live.note,
      previousSOInfo,
    });
    buffer = fallback.buffer;
    fileName = fallback.fileName;
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
