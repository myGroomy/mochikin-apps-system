// app/api/so/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callAppsScript } from '@/lib/appsscript';
import { withAuth, assertCabangAccess } from '@/lib/auth';

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
  const { cabangId, sesiId, items } = body;

  if (!cabangId || typeof cabangId !== 'string' || !cabangId.trim()) {
    return jsonError('CABANG_REQUIRED', 'Parameter cabangId wajib disertakan', 400);
  }
  if (!sesiId || typeof sesiId !== 'string' || !SESI_ID_RE.test(sesiId.trim())) {
    return jsonError('SESI_ID_INVALID', 'sesiId wajib berupa identifier unik sesi', 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return jsonError('ITEMS_REQUIRED', 'items wajib berisi minimal 1 item', 400);
  }

  const payload = { ...body, sesiId: sesiId.trim() };
  const guard = assertCabangAccess(session, cabangId.trim());
  if (guard) return guard;
  const result = await callAppsScript('submitSO', cabangId.trim(), payload);

  const already = result.success && result.data?.status === 'already_processed';
  const status = already ? 200 : result.success ? 201 : 400;

  return NextResponse.json(result, { status });
});