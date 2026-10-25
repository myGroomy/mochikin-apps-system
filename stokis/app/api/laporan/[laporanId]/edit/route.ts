// app/api/laporan/[laporanId]/edit/route.ts
// Edit existing SO report: update items, regenerate XLSX, keep same Drive file.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { resolveCabang } from '@/lib/google/registry';
import { writeRow, columnIndexToLetter } from '@/lib/google/sheets';
import { updateXlsxInDrive } from '@/lib/google/drive';
import { 
  getLaporanById, 
  getLaporanDetailRows, 
  getUrutanLaporan, 
  getSesiLiveData,
  updateLaporanXlsxLinkWithId,
  LAPORAN_DETAIL_SHEET,
  laporanDetailCol,
  ensureLaporanDetailSheet,
  logLaporanEdit,
  getLaporanEditLogs,
  canEditLaporan,
} from '@/lib/domain/laporan-service';
import { getMasterItems } from '@/lib/domain/master-item-service';
import { generateXlsxReport, type XlsxItem } from '@/lib/domain/xlsx-report';
import { generateXlsxFromTemplate } from '@/lib/google/template-xlsx';
import { calculateStatus } from '@/lib/domain/so';

function cellOf(field: string, rowNumber: number): string | null {
  const col = laporanDetailCol(field);
  if (col === null) return null;
  return `${LAPORAN_DETAIL_SHEET}!${columnIndexToLetter(col - 1)}${rowNumber}`;
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
  const laporan = await getLaporanById(cabangId, laporanId);
  if (!laporan) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' } },
      { status: 404 }
    );
  }
  if (!canEditLaporan(session, laporan.Petugas)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Anda hanya dapat melihat riwayat edit laporan milik Anda sendiri' } },
      { status: 403 }
    );
  }
  return NextResponse.json({ success: true, data: await getLaporanEditLogs(cabangId, laporanId) });
});

export const POST = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const body = await req.json().catch(() => ({}));
  const cabangId = typeof body.cabangId === 'string' ? body.cabangId : '';
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
      { success: false, error: { code: 'CABANG_REQUIRED' } },
      { status: 400 }
    );
  }
  if (!items || items.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'ITEMS_REQUIRED' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  // 1. Get existing laporan
  const laporan = await getLaporanById(cabangId, laporanId);
  if (!laporan) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (!canEditLaporan(session, laporan.Petugas)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Laporan hanya dapat diedit oleh petugas pembuat SO atau admin' } },
      { status: 403 }
    );
  }

  const sesiId = String(laporan['Sesi_ID'] || '');
  const existingFileId = laporan['Link_XLSX_FileId'];

  // 2. Update items in Laporan_SO
  // Pastikan header lengkap (self-healing) — kolom Tgl_Kedaluwarsa (Z) mungkin
  // belum ada di laporan lama.
  await ensureLaporanDetailSheet(cabangId);

  const { spreadsheetId, folderId, cabang } = await resolveCabang(cabangId);
  // Ambil baris detail BESERTA posisi fisiknya (Laporan_SO menampung banyak
  // laporan; index hasil filter TIDAK sama dengan nomor baris sheet).
  const detailRows = await getLaporanDetailRows(cabangId, laporanId);
  const rowByItemId = new Map<string, number>();
  detailRows.forEach((r) => {
    const itemId = String(r.data['Item_ID'] || '');
    if (itemId) rowByItemId.set(itemId, r.rowNumber);
  });

  // 3. Write updated fields per item.
  // Layout Laporan_SO (LAPORAN_DETAIL_HEADERS): Step1=P, Step2=Q, Total=R,
  // Penggunaan=S, Keterangan=T, Status=U, Status_Isi=V, Tgl_Refill=W,
  // Tgl_Pakai=X, Note=Y, Tgl_Kedaluwarsa=Z.
  for (const it of items) {
    const rowNumber = rowByItemId.get(it.itemId);
    if (rowNumber === undefined) continue;

    const existing = detailRows.find((r) => String(r.data['Item_ID']) === it.itemId)?.data || {};
    const threshold = existing['Threshold'] != null && existing['Threshold'] !== '' ? Number(existing['Threshold']) : null;
    const prevTotal = existing['Prev_Total'] != null ? Number(existing['Prev_Total']) : null;
    const step1 = Number(it.step1 ?? 0);
    const step2 = Number(it.step2 ?? 0);
    const total = step1 + step2;
    const penggunaan = prevTotal != null ? total - prevTotal : null;
    const status = calculateStatus(total, threshold);

    const fields: Array<{ field: string; value: unknown }> = [
      { field: 'Step1', value: step1 },
      { field: 'Step2', value: step2 },
      { field: 'Total', value: total },
      { field: 'Penggunaan', value: penggunaan },
      { field: 'Keterangan', value: it.keterangan ?? existing['Keterangan'] ?? '' },
      { field: 'Status', value: status },
      { field: 'Status_Isi', value: it.statusIsi ?? existing['Status_Isi'] ?? '' },
      { field: 'Tgl_Refill', value: it.tglRefill ?? existing['Tgl_Refill'] ?? '' },
      { field: 'Tgl_Pakai', value: it.tglPakai ?? existing['Tgl_Pakai'] ?? '' },
      { field: 'Tgl_Kedaluwarsa', value: it.tglKedaluwarsa ?? existing['Tgl_Kedaluwarsa'] ?? '' },
    ];

    for (const u of fields) {
      const addr = cellOf(u.field, rowNumber);
      if (addr === null) continue;
      const oldVal = String(existing[u.field] ?? '');
      const newVal = String(u.value ?? '');
      if (oldVal === newVal) continue;
      await writeRow(spreadsheetId, addr, [u.value ?? '']);
      await logLaporanEdit(cabangId, {
        laporanId,
        itemId: it.itemId,
        field: u.field,
        oldValue: oldVal,
        newValue: newVal,
        username: session?.username,
        nama: session?.nama,
        role: session?.role,
      });
    }
  }

  // 4. Re-fetch updated items for XLSX generation
  const updatedDetailRows = await getLaporanDetailRows(cabangId, laporanId);
  const live = await getSesiLiveData(spreadsheetId, sesiId);
  const urutanLaporan = await getUrutanLaporan(spreadsheetId);
  
  const masterItems = await getMasterItems(cabangId);
  const tipeInputMap = new Map<string, string>();
  masterItems.forEach((m) => tipeInputMap.set(String((m as Record<string, unknown>)['Item_ID'] || ''), String((m as Record<string, unknown>)['Tipe_Input'] || '')));

  const xlsxItems: XlsxItem[] = updatedDetailRows.map((r) => {
    const itemId = String(r.data['Item_ID'] || '');
    const fb = live.byItemId[itemId] || {};
    return {
      itemId,
      namaBarang: String(r.data['Nama_Barang'] || ''),
      area: String(r.data['Area'] || ''),
      satuan: String(r.data['Satuan'] || ''),
      threshold: r.data['Threshold'] != null && r.data['Threshold'] !== '' ? Number(r.data['Threshold']) : undefined,
      tipeInput: tipeInputMap.get(itemId) || '',
      step1: Number(r.data['Step1']) || 0,
      step2: Number(r.data['Step2']) || 0,
      keterangan: String(r.data['Keterangan'] || ''),
      prevStep1: r.data['Prev_Step1'] != null ? Number(r.data['Prev_Step1']) : null,
      prevStep2: r.data['Prev_Step2'] != null ? Number(r.data['Prev_Step2']) : null,
      prevTotal: r.data['Prev_Total'] != null ? Number(r.data['Prev_Total']) : null,
      statusIsi: (['Penuh', 'Dipakai', 'Habis'].includes(String(r.data['Status_Isi']))) 
        ? r.data['Status_Isi'] as 'Penuh' | 'Dipakai' | 'Habis' 
        : (fb.statusIsi || ''),
      tglRefill: String(r.data['Tgl_Refill'] || fb.tglRefill || ''),
      tglPakai: String(r.data['Tgl_Pakai'] || fb.tglPakai || ''),
      tglKedaluwarsa: String(r.data['Tgl_Kedaluwarsa'] || ''),
    };
  });

  const cabangNama = String(cabang['Nama_Cabang'] || '');
  const cabangKode = String(cabang['Cabang_ID'] || '');
  const tanggalOperasional = String(laporan['Tanggal_Operasional'] || '');
  const shift = String(laporan['Shift'] || '');
  const petugas = String(laporan['Petugas'] || '');

  // 5. Generate XLSX buffer
  let buffer: Buffer;
  let fileName: string;
  try {
    const result = await generateXlsxFromTemplate({
      laporanId,
      cabangNama,
      cabangKode,
      tanggalOperasional,
      shift,
      petugas,
      items: xlsxItems,
      groupMode: urutanLaporan,
      note: updatedDetailRows[0]?.data?.['Note'] ? String(updatedDetailRows[0].data['Note']) : live.note,
      previousSOInfo: {
        tanggal: updatedDetailRows[0]?.data?.['Prev_Tanggal'] ? String(updatedDetailRows[0].data['Prev_Tanggal']) : '',
        shift: updatedDetailRows[0]?.data?.['Prev_Shift'] ? String(updatedDetailRows[0].data['Prev_Shift']) : '',
      },
    });
    buffer = result.buffer;
    fileName = result.fileName;
  } catch {
    const fallback = await generateXlsxReport({
      laporanId,
      cabangNama,
      cabangKode,
      tanggalOperasional,
      shift,
      petugas,
      items: xlsxItems,
      groupMode: urutanLaporan,
      note: updatedDetailRows[0]?.data?.['Note'] ? String(updatedDetailRows[0].data['Note']) : live.note,
      previousSOInfo: {
        tanggal: updatedDetailRows[0]?.data?.['Prev_Tanggal'] ? String(updatedDetailRows[0].data['Prev_Tanggal']) : '',
        shift: updatedDetailRows[0]?.data?.['Prev_Shift'] ? String(updatedDetailRows[0].data['Prev_Shift']) : '',
      },
    });
    buffer = fallback.buffer;
    fileName = fallback.fileName;
  }

  // 6. Upload to Drive (update existing or create new)
  let xlsxLink = '';
  let newFileId = existingFileId || '';
  let isNewFile = false;

  if (folderId && existingFileId) {
    // Update existing file — keeps same link
    try {
      const upd = await updateXlsxInDrive(existingFileId, buffer);
      xlsxLink = upd.webViewLink || upd.downloadUrl;
      newFileId = upd.fileId;
    } catch (err) {
      console.error('[Edit] updateXlsxInDrive gagal:', err);
    }
  }

  if (!xlsxLink && folderId) {
    // Fallback: create new file (for old reports without fileId)
    const { uploadXlsxToDrive } = await import('@/lib/google/drive');
    try {
      const up = await uploadXlsxToDrive(folderId, fileName, buffer);
      xlsxLink = up.webViewLink || up.downloadUrl;
      newFileId = up.fileId;
      isNewFile = true;
    } catch (err) {
      console.error('[Edit] uploadXlsxToDrive gagal:', err);
    }
  }

  if (!xlsxLink) {
    const origin = req.nextUrl?.origin || process.env.APP_URL || '';
    xlsxLink = `${origin}/laporan/view/${encodeURIComponent(laporanId)}?cabang=${encodeURIComponent(cabangId)}`;
  }

  // 7. Save link + fileId
  await updateLaporanXlsxLinkWithId(cabangId, sesiId || laporanId, laporanId, xlsxLink, newFileId);

  return NextResponse.json({
    success: true,
    data: {
      xlsxLink,
      fileId: newFileId,
      isNewFile,
    }
  });
});