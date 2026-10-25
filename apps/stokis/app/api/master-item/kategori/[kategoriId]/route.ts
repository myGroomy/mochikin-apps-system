// app/api/master-item/kategori/[kategoriId]/route.ts
// Update kategori: rename / urutan / toggle aktif — admin only.
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { updateKategori } from '@/lib/domain/kategori-service';

export const PUT = withAuth(async (req: NextRequest, { params }, session) => {
  const { kategoriId } = await params;
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

  const result = await updateKategori(cabangId, kategoriId, {
    Nama_Kategori: body.Nama_Kategori !== undefined ? String(body.Nama_Kategori) : undefined,
    Urutan: body.Urutan !== undefined ? Number(body.Urutan) : undefined,
    Aktif: body.Aktif !== undefined ? !!body.Aktif : undefined,
  });
  return NextResponse.json({ success: true, data: result });
}, { requiredRole: 'admin' });