import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const { aktif } = body;

    const supabase = getSupabase();
    const isAktif = Boolean(aktif);
    const status = isAktif ? 'active' : 'inactive';

    const query = supabase
      .from('stokis_items')
      .update({ status, is_active: isAktif });

    const { error } = isUuid(itemId)
      ? await query.eq('id', itemId)
      : await query.eq('code', itemId);

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { itemId, aktif: isAktif } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui status item';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}, { requiredRole: 'admin' });
