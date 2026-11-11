import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { careRepo } from '@/lib/care/repository';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  try {
    const complaints = await careRepo.getMyComplaints(auth.personId);
    return NextResponse.json({ ok: true, data: complaints });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal memuat keluhan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request as never);
  if ('response' in authResult) return authResult.response;
  const { auth } = authResult;

  try {
    const period = await careRepo.getCurrentOpenPeriod();
    if (!period) {
      return NextResponse.json({ ok: false, error: 'Tidak ada periode yang sedang buka' }, { status: 400 });
    }

    const body = await request.json();
    const { category, text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'Teks keluhan tidak boleh kosong' }, { status: 400 });
    }

    const complaintId = await careRepo.createComplaint(period.period_id, auth.personId, category, text);
    return NextResponse.json({ ok: true, data: { complaintId }, message: 'Keluhan berhasil dikirim' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal mengirim keluhan' },
      { status: 500 }
    );
  }
}
