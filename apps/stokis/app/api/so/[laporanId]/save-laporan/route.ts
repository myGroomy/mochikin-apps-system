// Laporan sudah disimpan ke stokis_opnames saat /api/so POST berhasil.
// Route ini hanya memastikan laporanId dikembalikan ke frontend.
import { NextRequest, NextResponse } from 'next/server';
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

  if (!cabangId) return jsonError('CABANG_REQUIRED', 'Parameter cabangId wajib disertakan', 400);
  if (!sesiId) return jsonError('SESI_ID_REQUIRED', 'Parameter sesiId wajib disertakan', 400);

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  // Data sudah ada di stokis_opnames. sesiId == laporanId di RDBMS.
  return NextResponse.json({ success: true, data: { laporanId: sesiId } });
});
