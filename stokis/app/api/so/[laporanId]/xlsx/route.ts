// app/api/so/[laporanId]/xlsx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { resolveCabang } from '@/lib/google/registry';
import { updateLaporanXlsxLink, getUrutanLaporan } from '@/lib/domain/laporan-service';
import { uploadFileToGASDrive } from '@/lib/appsscript';
import { generateXlsxReport } from '@/lib/domain/xlsx-report';
import { generateXlsxFromTemplate } from '@/lib/google/template-xlsx';

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
  const body = await req.json();
  const { items, cabangId, cabangNama, cabangKode, tanggalOperasional, shift, petugas, previousSOInfo, sesiId, note } = body;

  if (!cabangId || typeof cabangId !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabangId wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const { spreadsheetId } = await resolveCabang(cabangId);
  const urutanLaporan = await getUrutanLaporan(spreadsheetId);

  const xlsxInput = {
    laporanId,
    cabangNama,
    cabangKode,
    tanggalOperasional,
    shift,
    petugas,
    items: Array.isArray(items) ? items : [],
    groupMode: urutanLaporan,
    previousSOInfo,
    note,
  };

  let buffer: Buffer;
  let fileName: string;
  try {
    const templateResult = await generateXlsxFromTemplate(xlsxInput);
    buffer = templateResult.buffer;
    fileName = templateResult.fileName;
  } catch (templateErr) {
    console.warn('[XLSX] Template approach gagal, fallback ExcelJS:', templateErr);
    const fallback = await generateXlsxReport(xlsxInput);
    buffer = fallback.buffer;
    fileName = fallback.fileName;
  }

  // Upload to Drive via GAS with retry logic
  const keySesi = typeof sesiId === 'string' && sesiId ? sesiId : laporanId;
  let xlsxLink = '';

  try {
    const { folderId } = await resolveCabang(cabangId);
    if (folderId) {
      // Use retry wrapper instead of direct call
      const res = await uploadFileToGASDriveWithRetry({
        folderId,
        fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });
      xlsxLink = res.webViewLink || res.downloadUrl;
      console.log(`[XLSX] Upload success: ${xlsxLink}`);
    }
  } catch (err) {
    // Upload failed after all retries - fallback to in-app web view
    console.error('[XLSX] GAS upload failed after 3 retries. Using web view fallback:', err);
    const origin = req.nextUrl?.origin || process.env.APP_URL || '';
    xlsxLink = `${origin}/laporan/view/${encodeURIComponent(laporanId)}?cabang=${encodeURIComponent(cabangId)}`;
  }

  // Always update database with the result (empty string if failed)
  try {
    await updateLaporanXlsxLink(cabangId, keySesi, laporanId, xlsxLink);
    console.log(`[XLSX] Updated Link_XLSX in database: ${xlsxLink || '(empty - upload failed)'}`);
  } catch (err) {
    console.error('[XLSX] Failed to update Link_XLSX in database:', err);
    // non-critical - continue anyway
  }

  // Always return XLSX blob for backward compatibility
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  });
});
