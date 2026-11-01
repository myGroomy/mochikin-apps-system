import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branch_id') || '00000000-0000-0000-0000-000000000001';
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('mycustomer_point_config')
      .select('*')
      .eq('branch_id', branchId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      config: data || {
        branch_id: branchId,
        repeat_customer_point: true,
        repeat_wa_point: true,
        points_per_wa: 1.0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch_id, repeat_customer_point, repeat_wa_point, points_per_wa, updated_by } = body;

    const branchId = branch_id || '00000000-0000-0000-0000-000000000001';
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database tidak tersedia' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('mycustomer_point_config')
      .upsert(
        {
          branch_id: branchId,
          repeat_customer_point: repeat_customer_point ?? true,
          repeat_wa_point: repeat_wa_point ?? true,
          points_per_wa: Number(points_per_wa ?? 1.0),
          updated_by: updated_by || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'branch_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, config: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
