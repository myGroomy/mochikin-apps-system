// app/api/laporan/[laporanId]/regenerate/route.ts
// Regenerate XLSX untuk laporan yang sudah ada berdasarkan data di SO_Transaksi.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { resolveCabang } from '@/lib/google/registry';
import { readSheetData, sheetToObjects } from '@/lib/google/sheets';
import { getSheetsClient } from '@/lib/google/client';
import { uploadFileToGASDrive } from '@/lib/appsscript';
import { updateLaporanXlsxLink, getUrutanLaporan } from '@/lib/domain/laporan-service';
import { getMasterItems } from '@/lib/domain/master-item-service';
import { generateXlsxReport, type XlsxItem } from '@/lib/domain/xlsx-report';
import { calculateStatus, parseThreshold } from '@/lib/domain/so';

/**
 * Retry wrapper for uploadFileToGASDrive with exponential backoff.
 * 
 * Retry strategy:
 * - Attempt 1: immediate (0ms delay)
 * - Attempt 2: after 500ms
 * - Attempt 3: after 1000ms
 * 
 * Total max: 3 attempts
 * 
 * Retryable errors: transient network errors, timeouts, 5xx errors
 * Non-retryable: 4xx errors (except 408, 429), permanent failures
 */
async function uploadFileToGASDriveWithRetry(
  params: {
    folderId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  },
  maxAttempts: number = 3
): Promise<{ fileId: string; webViewLink: string; downloadUrl: string }> {
  const delays = [0, 500, 1000]; // ms delays before each attempt
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait before attempt (except first attempt)
      if (attempt > 1) {
        const delayMs = delays[attempt - 2] || 0;
        if (delayMs > 0) {
          console.log(`[XLSX RETRY] Attempt ${attempt}/${maxAttempts} - waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      console.log(`[XLSX RETRY] Attempt ${attempt}/${maxAttempts} - uploading to GAS Drive...`);
      const result = await uploadFileToGASDrive(params);
      console.log(`[XLSX RETRY] Attempt ${attempt}/${maxAttempts} - SUCCESS`);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errorMsg = lastError.message;
      const causeStr = lastError.cause ? (typeof lastError.cause === 'object' ? JSON.stringify(lastError.cause) : String(lastError.cause)) : '';
      const fullErrorText = `${errorMsg} ${causeStr} ${lastError.stack || ''}`;

      // Determine if error is retryable
      const isRetryable =
        fullErrorText.includes('fetch failed') ||
        fullErrorText.includes('timeout') ||
        fullErrorText.includes('ECONNREFUSED') ||
        fullErrorText.includes('ECONNRESET') ||
        fullErrorText.includes('ETIMEDOUT') ||
        fullErrorText.includes('500') ||
        fullErrorText.includes('502') ||
        fullErrorText.includes('503') ||
        fullErrorText.includes('504') ||
        fullErrorText.includes('429') ||
        fullErrorText.includes('temporary') ||
        fullErrorText.includes('transient');

      console.error(`[XLSX RETRY] Attempt ${attempt}/${maxAttempts} - FAILED: ${errorMsg} (retryable: ${isRetryable})`);

      // Don't retry permanent errors
      if (!isRetryable || attempt === maxAttempts) {
        if (attempt === maxAttempts) {
          console.error(`[XLSX RETRY] All ${maxAttempts} attempts exhausted. Last error: ${errorMsg}`);
        }
        throw lastError;
      }
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('Upload gagal setelah semua retry');
}

export const POST = withAuth(async (req: NextRequest, { params }, session) => {
  const { laporanId } = await params;
  const body = await req.json().catch(() => ({}));
  const cabangId = typeof body.cabangId === 'string' ? body.cabangId : '';

  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabangId wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  // 1. Resolve cabang info
  const { spreadsheetId, folderId, cabang } = await resolveCabang(cabangId);
  const cabangNama = String(cabang['Nama_Cabang'] || '');
  const cabangKode = String(cabang['Cabang_ID'] || '');

  // 2. Resolve Sesi_ID dari Laporan_PDF menggunakan Laporan_ID (laporanId).
  //    Sheet Laporan_PDF ditulis tanpa header baris (data mulai baris 1),
  //    jadi baca raw values semua baris dan cari baris yang kolom[0] === laporanId.
  const sheets = getSheetsClient();
  const laporanPdfRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Laporan_PDF',
  });
  const laporanPdfRows = laporanPdfRes.data.values || [];
  const laporanRow = laporanPdfRows.find((r) => String(r[0] || '') === laporanId);
  if (!laporanRow) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Laporan ID ' + laporanId + ' tidak ditemukan di Laporan_PDF' } },
      { status: 404 }
    );
  }
  const sesiIdFromLaporan = String(laporanRow[1] || '');

  // 3. Baca SO_Transaksi langsung, filter by Sesi_ID yang resolved dari Laporan_PDF
  const { headers: soHeaders, rows: soRows } = await readSheetData(spreadsheetId, 'SO_Transaksi');
  const allSORows = sheetToObjects(soHeaders, soRows) as Record<string, unknown>[];
  const sesiRows = allSORows.filter((r) => String(r['Sesi_ID'] || '') === sesiIdFromLaporan);

  if (sesiRows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Sesi ID ' + sesiIdFromLaporan + ' (dari Laporan ' + laporanId + ') tidak ditemukan di SO_Transaksi' } },
      { status: 404 }
    );
  }

  // 4. Ambil metadata dari baris pertama SO_Transaksi
  const firstRow = sesiRows[0];
  const tanggalOperasional = String(firstRow['Tanggal_Operasional'] || firstRow['Tanggal'] || '');
  const shift = String(firstRow['Shift'] || '');
  const petugas = String(firstRow['Petugas'] || '');
  const sesiId = String(firstRow['Sesi_ID'] || sesiIdFromLaporan || laporanId);
  const note = String(firstRow['Note'] || '');

  // 4. Ambil Urutan_Laporan dari Settings
  const urutanLaporan = await getUrutanLaporan(spreadsheetId);

  // 5. Fetch master items untuk Tipe_Input
  const masterItems = await getMasterItems(cabangId);
  const tipeInputMap = new Map<string, string>();
  masterItems.forEach((m: any) => { tipeInputMap.set(String(m['Item_ID'] || ''), String(m['Tipe_Input'] || '')); });

  // 6. Map SO_Transaksi rows ke XlsxItem[]
  const items: XlsxItem[] = sesiRows.map((r) => {
    const itemId = String(r['Item_ID'] || r['itemId'] || r['Item ID'] || '');
    const namaBarang = String(r['Nama_Barang'] || r['Nama Barang'] || r['Item_Name'] || '');
    const area = String(r['Area'] || '');
    const satuan = String(r['Satuan'] || '');
    const threshold = parseThreshold(r['Threshold']) ?? undefined;
    const step1 = Number(r['Step1']) || 0;
    const step2 = Number(r['Step2']) || 0;
    const keterangan = String(r['Keterangan'] || '');

    const rawStatus = String(r['Status_Isi'] || r['Status Isi'] || r['statusIsi'] || r['Status'] || '').trim().toLowerCase();
    let statusIsi: 'Penuh' | 'Dipakai' | 'Habis' | '' = '';
    if (rawStatus === 'penuh' || rawStatus === 'full' || rawStatus === 'aman' || rawStatus === 'true' || rawStatus === '1' || rawStatus === 'ada') statusIsi = 'Penuh';
    else if (rawStatus === 'dipakai' || rawStatus === 'hampir' || rawStatus === 'sedang dipakai') statusIsi = 'Dipakai';
    else if (rawStatus === 'habis' || rawStatus === 'empty' || rawStatus === 'kritis' || rawStatus === 'false' || rawStatus === '0' || rawStatus === 'kosong') statusIsi = 'Habis';

    return {
      itemId,
      namaBarang,
      area,
      satuan,
      threshold,
      tipeInput: tipeInputMap.get(itemId) || '',
      step1,
      step2,
      keterangan,
      prevStep1: null,
      prevStep2: null,
      prevTotal: null,
      prevKeterangan: '',
      statusIsi,
      tglRefill: String(r['Tgl_Refill'] || r['Tgl Refill'] || r['tglRefill'] || r['Tgl_Tercatat'] || ''),
      tglPakai: String(r['Tgl_Pakai'] || r['Tgl Pakai'] || r['tglPakai'] || ''),
      tglKedaluwarsa: String(r['Tgl_Kedaluwarsa'] || ''),
    };
  });

  const previousSOInfo = {
    tanggal: '',
    shift: '',
  };

  const results: { xlsx?: string; error?: string } = {};

  // 7. Generate XLSX (In-Memory Engine)
  try {
    const { buffer, fileName } = await generateXlsxReport({
      laporanId,
      cabangNama,
      cabangKode,
      tanggalOperasional,
      shift,
      petugas,
      items,
      groupMode: urutanLaporan,
      note,
      previousSOInfo,
    });

    let xlsxLink = '';
    if (folderId) {
      try {
        const res = await uploadFileToGASDrive({ folderId, fileName, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
        xlsxLink = res.webViewLink || res.downloadUrl;
      } catch (err) {
        console.error('[Regenerate] XLSX GAS upload gagal:', err);
      }
    }
    if (!xlsxLink) {
      const origin = req.nextUrl?.origin || process.env.APP_URL || '';
      xlsxLink = `${origin}/laporan/view/${encodeURIComponent(laporanId)}?cabang=${encodeURIComponent(cabangId)}`;
    }
    await updateLaporanXlsxLink(cabangId, sesiId || laporanId, laporanId, xlsxLink);
    results.xlsx = xlsxLink;
  } catch (err) {
    results.error = 'XLSX: ' + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ success: true, data: results });
});
