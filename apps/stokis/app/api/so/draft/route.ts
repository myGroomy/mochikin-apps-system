// app/api/so/draft/route.ts
// Server API Endpoint untuk mengelola SO Draft per user (GET, POST, DELETE)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getDraftByUser, saveDraftByUser, deleteDraftByUser } from '@/lib/domain/draft-service';

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// GET: Ambil draft milik user yang sedang login
export const GET = withAuth(async (_req: NextRequest, _ctx, session) => {
  try {
    const draft = await getDraftByUser(session.username);
    if (!draft) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({
      success: true,
      data: {
        username: draft.Username,
        cabangId: draft.Cabang_ID,
        shift: draft.Shift,
        draftJson: draft.Draft_JSON,
        updatedAt: draft.Updated_At,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError('FETCH_DRAFT_FAILED', 'Gagal mengambil draft: ' + msg, 500);
  }
});

// POST: Simpan/update draft milik user yang sedang login
export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError('PAYLOAD_INVALID', 'Body request bukan JSON valid', 400);
  }

  const { cabangId, shift, draftJson } = body || {};

  if (!cabangId || typeof cabangId !== 'string') {
    return jsonError('CABANG_REQUIRED', 'cabangId wajib disertakan', 400);
  }
  if (!draftJson || typeof draftJson !== 'string') {
    return jsonError('DRAFT_JSON_REQUIRED', 'draftJson wajib disertakan', 400);
  }

  try {
    const ok = await saveDraftByUser(session.username, cabangId, shift || 'Opening', draftJson);
    if (!ok) {
      return jsonError('SAVE_DRAFT_FAILED', 'Gagal menyimpan draft ke server', 500);
    }
    return NextResponse.json({ success: true, message: 'Draft berhasil disimpan' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError('SAVE_DRAFT_FAILED', 'Gagal menyimpan draft: ' + msg, 500);
  }
});

// DELETE: Hapus draft milik user yang sedang login
export const DELETE = withAuth(async (_req: NextRequest, _ctx, session) => {
  try {
    await deleteDraftByUser(session.username);
    return NextResponse.json({ success: true, message: 'Draft berhasil dihapus' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError('DELETE_DRAFT_FAILED', 'Gagal menghapus draft: ' + msg, 500);
  }
});
