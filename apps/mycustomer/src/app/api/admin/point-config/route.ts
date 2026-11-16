import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser } from '@/lib/apiAuth';
import { getSupabase } from '@/lib/supabase';
import { validateMasterPoints, buildChangeRecord, logPointMasterChange } from '@mochikin/shared/points';

async function resolveBranchId(supabase: ReturnType<typeof getSupabase>, value: string) {
  const query = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? supabase.from('branches').select('id').eq('id', value)
    : supabase.from('branches').select('id').eq('code', value);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.id;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const supabase = getSupabase();
    const branchRef = req.nextUrl.searchParams.get('branch_id') || auth.user.branch;
    const branchId = await resolveBranchId(supabase, branchRef);
    if (!branchId) return NextResponse.json({ success: false, error: 'Cabang tidak ditemukan' }, { status: 404 });

    const { data, error } = await supabase
      .from('mycustomer_branch_settings')
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
    const auth = await authenticatedUser(['owner', 'admin']);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { branch_id, repeat_customer_point, repeat_wa_point, points_per_wa, reason } = body;

    const supabase = getSupabase();
    const branchRef = branch_id || auth.user.branch;
    const branchId = typeof branchRef === 'string' ? await resolveBranchId(supabase, branchRef) : undefined;
    if (!branchId) return NextResponse.json({ success: false, error: 'Cabang tidak ditemukan' }, { status: 404 });

    // Validate points
    const pointValidation = validateMasterPoints(points_per_wa, { max: 1000 });
    if (!pointValidation.valid) {
      return NextResponse.json({ success: false, error: pointValidation.error || 'Nilai poin tidak valid' }, { status: 400 });
    }
    const cleanPoints = pointValidation.value;

    // Fetch existing config for old_points audit
    const { data: existing } = await supabase
      .from('mycustomer_branch_settings')
      .select('points_per_wa')
      .eq('branch_id', branchId)
      .maybeSingle();

    const oldPoints = existing ? Number(existing.points_per_wa) : 1.0;

    const { data, error } = await supabase
      .from('mycustomer_branch_settings')
      .upsert(
        {
          branch_id: branchId,
          repeat_customer_point: repeat_customer_point ?? true,
          repeat_wa_point: repeat_wa_point ?? true,
          points_per_wa: cleanPoints,
          updated_by: auth.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'branch_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // Log to point_master_changes if points changed
    if (oldPoints !== cleanPoints) {
      const changeRecord = buildChangeRecord({
        appId: 'mycustomer',
        entityType: 'branch_config',
        entityRef: branchId,
        entityLabel: `Cabang ${branchId}`,
        oldPoints,
        newPoints: cleanPoints,
        action: 'set',
        reason: reason || 'Update konfigurasi poin cabang MyCustomer',
        changedBy: auth.user.username || auth.user.id,
      });

      await logPointMasterChange(supabase, changeRecord);
    }

    return NextResponse.json({ success: true, config: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
