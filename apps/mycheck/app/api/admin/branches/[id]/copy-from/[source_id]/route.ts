import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '../../../../../../../lib/api-auth';
import { getSupabase } from '../../../../../../../lib/supabase';

async function templateCounts(branchId: string) {
  const supabase = getSupabase();
  const { data: shifts, error: shiftsError } = await supabase
    .from('mycheck_shift_definitions')
    .select('id')
    .eq('branch_id', branchId);
  if (shiftsError) throw new Error(`Supabase shift list failed: ${shiftsError.message}`);

  const shiftIds = (shifts ?? []).map(({ id }) => id);
  const { data: categories, error: categoriesError } = shiftIds.length
    ? await supabase.from('mycheck_sop_categories').select('id').in('shift_definition_id', shiftIds)
    : { data: [], error: null };
  if (categoriesError) throw new Error(`Supabase SOP category list failed: ${categoriesError.message}`);

  const categoryIds = (categories ?? []).map(({ id }) => id);
  const [points, handoverFields, incidentCategories] = await Promise.all([
    categoryIds.length
      ? supabase.from('mycheck_checklist_points').select('id').in('category_id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    shiftIds.length
      ? supabase.from('mycheck_handover_fields').select('id').in('shift_definition_id', shiftIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('mycheck_incident_categories').select('id').eq('branch_id', branchId),
  ]);
  if (points.error) throw new Error(`Supabase checklist point list failed: ${points.error.message}`);
  if (handoverFields.error) throw new Error(`Supabase handover field list failed: ${handoverFields.error.message}`);
  if (incidentCategories.error) throw new Error(`Supabase incident category list failed: ${incidentCategories.error.message}`);

  return {
    ShiftDefinitions: shiftIds.length,
    SopCategories: categories?.length ?? 0,
    ChecklistPoints: points.data?.length ?? 0,
    HandoverFields: handoverFields.data?.length ?? 0,
    IncidentCategories: incidentCategories.data?.length ?? 0,
  };
}

async function resolveAccessibleBranches(sourceCode: string, targetCode: string, accessible: string[]) {
  if (sourceCode === targetCode) throw new Error('Sumber dan tujuan harus berbeda.');
  if (!accessible.includes(sourceCode) || !accessible.includes(targetCode)) {
    throw new Error('Akses ditolak untuk salah satu cabang.');
  }
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id,code')
    .in('code', [sourceCode, targetCode])
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw new Error(`Supabase branch lookup failed: ${error.message}`);
  const source = data?.find((branch) => branch.code === sourceCode);
  const target = data?.find((branch) => branch.code === targetCode);
  if (!source || !target) throw new Error('Cabang sumber atau tujuan tidak ditemukan.');
  return { sourceId: source.id, targetId: target.id };
}

export const GET = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;
  const parts = new URL(req.url).pathname.split('/');
  const sourceCode = parts.at(-1) ?? '';
  const targetCode = parts.at(-3) ?? '';

  try {
    const { sourceId, targetId } = await resolveAccessibleBranches(sourceCode, targetCode, ctx.branchIds);
    const [sourceCounts, targetCounts] = await Promise.all([
      templateCounts(sourceId),
      templateCounts(targetId),
    ]);
    return NextResponse.json({
      preview: {
        sourceBranchId: sourceCode,
        targetBranchId: targetCode,
        sourceCounts,
        targetCounts,
        replace: false,
        safeToApply: targetCounts.ShiftDefinitions === 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat template cabang.';
    const status = message.includes('Akses ditolak') ? 403 : message.includes('berbeda') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

export const POST = withAuth(async (req, ctx, session) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;
  const parts = new URL(req.url).pathname.split('/');
  const sourceCode = parts.at(-1) ?? '';
  const targetCode = parts.at(-3) ?? '';

  try {
    const { sourceId, targetId } = await resolveAccessibleBranches(sourceCode, targetCode, ctx.branchIds);
    const { data, error } = await getSupabase().rpc('mycheck_copy_branch_template', {
      p_source_branch_id: sourceId,
      p_target_branch_id: targetId,
      p_actor_id: session.username,
    });
    if (error) {
      const status = error.message.includes('already has shift definitions') ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({
      message: 'Template cabang berhasil disalin',
      backupReference: data.auditId,
      copied: {
        shiftDefinitions: data.shiftDefinitions,
        categories: data.categories,
        checklistPoints: data.checklistPoints,
        handoverFields: data.handoverFields,
        incidentCategories: data.incidentCategories,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyalin template cabang.';
    const status = message.includes('Akses ditolak') ? 403 : message.includes('berbeda') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
