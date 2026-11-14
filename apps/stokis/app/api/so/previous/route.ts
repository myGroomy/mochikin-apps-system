// app/api/so/previous/route.ts
import { NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getPreviousSOFromDb } from '@/lib/domain/stokis-repository';

export const GET = withAuth(async (request: Request, _ctx, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const cabangId = searchParams.get('cabang');

    if (!cabangId) {
      return NextResponse.json(
        { success: false, error: { message: 'Parameter cabang wajib disertakan' } },
        { status: 400 }
      );
    }

    const guard = assertCabangAccess(session, cabangId);
    if (guard) return guard;

    const data = await getPreviousSOFromDb(cabangId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { message: 'Gagal mengambil data SO sebelumnya: ' + message } },
      { status: 500 }
    );
  }
});
