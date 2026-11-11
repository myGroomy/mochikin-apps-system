import { NextResponse } from 'next/server';
import { careRepo } from '@/lib/care/repository';

export async function GET() {
  try {
    const dimensions = await careRepo.getDimensions();
    return NextResponse.json({ ok: true, data: dimensions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Gagal mengambil dimensi' },
      { status: 500 }
    );
  }
}
