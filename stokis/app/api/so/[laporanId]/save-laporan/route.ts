// app/api/so/[laporanId]/save-laporan/route.ts
// Menyimpan catatan laporan ke Laporan_PDF secara langsung dari payload,
// terlepas dari keberhasilan upload Drive, sehingga halaman
// konfirmasi/berbagi selalu punya laporanId yang valid.
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError('PAYLOAD_INVALID', 'Body request bukan JSON valid', 400);
  }

  const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const cabangId = typeof body.cabangId === 'string' ? body.cabangId.trim() : '';
  const sesiId = typeof body.sesiId === 'string' ? body.sesiId.trim() : '';

  if (!cabangId) {
    return jsonError('CABANG_REQUIRED', 'Parameter cabangId wajib disertakan', 400);
  }
  if (!sesiId) {
    return jsonError('SESI_ID_REQUIRED', 'Parameter sesiId wajib disertakan', 400);
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const rawPreviousSOInfo =
    body.previousSOInfo &&
    typeof body.previousSOInfo === 'object' &&
    !Array.isArray(body.previousSOInfo)
      ? (body.previousSOInfo as { tanggal?: unknown; shift?: unknown })
      : null;

  const payload = {
    sesiId,
    tanggalOperasional: body.tanggalOperasional || '',
    shift: body.shift || '',
    petugas: body.petugas || '',
    items: Array.isArray(body.items) ? body.items : [],
    linkPdf: typeof body.linkPdf === 'string' ? body.linkPdf : '',
    note: typeof body.note === 'string' ? body.note : '',
    previousSOInfo: rawPreviousSOInfo
      ? {
          tanggal: String(rawPreviousSOInfo.tanggal || ''),
          shift: String(rawPreviousSOInfo.shift || ''),
        }
      : null,
  };

  const result = await callAppsScript('saveLaporan', cabangId, payload);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
});
