import { AuthContext } from '../api-auth';
import { getSupabase } from '../supabase';

export interface ConfigLocation {
  spreadsheetId: string;
  branchId: string;
}

async function accessibleBranches(ctx: AuthContext): Promise<{ id: string; code: string }[]> {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id,code')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) throw new Error(`Supabase authorized branch lookup failed: ${error.message}`);
  return data ?? [];
}

export async function locateShiftDefinition(
  ctx: AuthContext,
  shiftDefinitionId: string
): Promise<ConfigLocation | null> {
  const branches = await accessibleBranches(ctx);
  if (!branches.length) return null;
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .select('id,branch_id')
    .eq('id', shiftDefinitionId)
    .in('branch_id', branches.map((branch) => branch.id))
    .maybeSingle();
  if (error) throw new Error(`Supabase shift lookup failed: ${error.message}`);
  if (!data) return null;
  const branch = branches.find((item) => item.id === data.branch_id);
  return branch ? { spreadsheetId: branch.id, branchId: branch.code } : null;
}

export async function locateSopCategory(
  ctx: AuthContext,
  sopCategoryId: string
): Promise<(ConfigLocation & { shiftDefinitionId: string }) | null> {
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .select('shift_definition_id')
    .eq('id', sopCategoryId)
    .maybeSingle();
  if (error) throw new Error(`Supabase category lookup failed: ${error.message}`);
  if (!data) return null;
  const location = await locateShiftDefinition(ctx, data.shift_definition_id);
  return location ? { ...location, shiftDefinitionId: data.shift_definition_id } : null;
}

export async function locateChecklistPoint(
  ctx: AuthContext,
  pointId: string
): Promise<(ConfigLocation & { sopCategoryId: string }) | null> {
  const { data, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .select('category_id')
    .eq('id', pointId)
    .maybeSingle();
  if (error) throw new Error(`Supabase checklist point lookup failed: ${error.message}`);
  if (!data) return null;
  const location = await locateSopCategory(ctx, data.category_id);
  return location ? { ...location, sopCategoryId: data.category_id } : null;
}

export async function locateHandoverField(
  ctx: AuthContext,
  fieldId: string
): Promise<(ConfigLocation & { shiftDefinitionId: string }) | null> {
  const { data, error } = await getSupabase()
    .from('mycheck_handover_fields')
    .select('shift_definition_id')
    .eq('id', fieldId)
    .maybeSingle();
  if (error) throw new Error(`Supabase handover field lookup failed: ${error.message}`);
  if (!data) return null;
  const location = await locateShiftDefinition(ctx, data.shift_definition_id);
  return location ? { ...location, shiftDefinitionId: data.shift_definition_id } : null;
}

export async function locateIncidentCategory(
  ctx: AuthContext,
  categoryId: string
): Promise<ConfigLocation | null> {
  const branches = await accessibleBranches(ctx);
  if (!branches.length) return null;
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('branch_id')
    .eq('id', categoryId)
    .in('branch_id', branches.map((branch) => branch.id))
    .maybeSingle();
  if (error) throw new Error(`Supabase incident category lookup failed: ${error.message}`);
  if (!data) return null;
  const branch = branches.find((item) => item.id === data.branch_id);
  return branch ? { spreadsheetId: branch.id, branchId: branch.code } : null;
}
