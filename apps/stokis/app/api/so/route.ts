// app/api/so/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { submitSOToDb, type SubmitSOPayload } from '@/lib/domain/stokis-repository';

const SESI_ID_RE = /^SES[_-][A-Za-z0-9_-]{4,64}$/i;

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

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return jsonError('PAYLOAD_INVALID', 'Body request tidak valid', 400);
  }

  const body = raw as Record<string, unknown>;
  const { cabangId, sesiId, items, tanggalOperasional, shift, petugas, note } = body;

  if (!cabangId || typeof cabangId !== 'string' || !cabangId.trim()) {
    return jsonError('CABANG_REQUIRED', 'Parameter cabangId wajib disertakan', 400);
  }
  if (!sesiId || typeof sesiId !== 'string' || !SESI_ID_RE.test(sesiId.trim())) {
    return jsonError('SESI_ID_INVALID', 'sesiId wajib berupa identifier unik sesi', 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return jsonError('ITEMS_REQUIRED', 'items wajib berisi minimal 1 item', 400);
  }

  const guard = assertCabangAccess(session, cabangId.trim());
  if (guard) return guard;

  try {
    const payload: SubmitSOPayload = {
      cabangId: cabangId.trim(),
      sesiId: sesiId.trim(),
      tanggalOperasional: String(tanggalOperasional || new Date().toISOString().slice(0, 10)),
      shift: String(shift || 'closing'),
      petugas: String(petugas || session?.nama || 'Petugas'),
      items: items as SubmitSOPayload['items'],
      note: typeof note === 'string' ? note.trim() : '',
    };

    const result = await submitSOToDb(payload);
    const already = result.status === 'already_processed';
    const status = already ? 200 : 201;

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan transaksi stock opname';
    console.error('Error submitting SO to Supabase:', err);
    return jsonError('DATABASE_ERROR', message, 500);
  }
});
