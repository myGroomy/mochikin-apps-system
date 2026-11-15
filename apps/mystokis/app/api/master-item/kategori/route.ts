// app/api/master-item/kategori/route.ts
// Daftar & tambah kategori (Area) per-cabang — admin only.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getKategoriList, addKategori } from '@/lib/domain/kategori-service';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const cabangId = searchParams.get('cabang') || '';
  const includeNonaktif = searchParams.get('includeNonaktif') === 'true';

  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabang wajib disertakan' } },
      { status: 400 }
    );
  }

  const list = await getKategoriList(cabangId, includeNonaktif);
  return NextResponse.json({ success: true, data: list });
}, { requiredRole: 'admin' });

export const POST = withAuth(async (req: NextRequest, _ctx, session) => {
  const body = await req.json().catch(() => ({}));
  const cabangId = typeof body.cabangId === 'string' ? body.cabangId : '';

  if (!cabangId) {
    return NextResponse.json(
      { success: false, error: { code: 'CABANG_REQUIRED', message: 'Parameter cabang wajib disertakan' } },
      { status: 400 }
    );
  }

  const guard = assertCabangAccess(session, cabangId);
  if (guard) return guard;

  const result = await addKategori(cabangId, {
    Nama_Kategori: typeof body.Nama_Kategori === 'string' ? body.Nama_Kategori : '',
    Urutan: body.Urutan !== undefined ? Number(body.Urutan) : undefined,
  });
  return NextResponse.json({ success: true, data: result }, { status: 201 });
}, { requiredRole: 'admin' });