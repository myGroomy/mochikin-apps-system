import { NextRequest, NextResponse } from 'next/server';
import { withAuth, assertCabangAccess } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const PATCH = withAuth(async (req: NextRequest, { params }, session) => {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const { cabangId, tipeInput } = body;

    if (cabangId) {
      const guard = assertCabangAccess(session, cabangId);
      if (guard) return guard;
    }

    const supabase = getSupabase();
    const query = supabase
      .from('stokis_items')
      .update({ tipe_input: tipeInput });

    const { error } = isUuid(itemId)
      ? await query.eq('id', itemId)
      : await query.eq('code', itemId);

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { itemId, tipeInput } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui tipe input';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
});
