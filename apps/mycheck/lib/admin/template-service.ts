import { getSupabase } from '../supabase';
import { normalizeInputTypes } from '../shared';
import { normalizeSectionColor } from '../shared/section-color';

export interface ShiftDefinition {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  crosses_midnight: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface SopCategory {
  id: string;
  shift_definition_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  color?: string | null;
}

export interface ChecklistPoint {
  id: string;
  sop_category_id: string;
  title: string;
  instruction: string | null;
  input_type: string;
  input_types: string[];
  options: string[] | null;
  is_required: boolean;
  target_time: string | null;
  tolerance_minutes: number | null;
  active_days: string | null;
  number_min: number | null;
  number_max: number | null;
  sort_order: number;
  is_active: boolean;
  points: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface HandoverField {
  id: string;
  shift_definition_id: string;
  label: string;
  field_type: string;
  input_types: string[];
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface IncidentCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  points: number;
  penalty_min_severity: string;
  created_at: string;
  updated_at: string;
}

const nowIso = () => new Date().toISOString();
const fail = (error: { message: string }, context: string): never => {
  throw new Error(`Supabase ${context} failed: ${error.message}`);
};

async function assertShiftInBranch(branchId: string, shiftId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .select('id')
    .eq('id', shiftId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) fail(error, 'shift lookup');
  if (!data) throw new Error('SHIFT_DEFINITION_TIDAK_DITEMUKAN');
}

async function assertCategoryInBranch(branchId: string, categoryId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .select('id,mycheck_shift_definitions!inner(branch_id)')
    .eq('id', categoryId)
    .eq('mycheck_shift_definitions.branch_id', branchId)
    .maybeSingle();
  if (error) fail(error, 'category lookup');
  if (!data) throw new Error('SOP_CATEGORY_TIDAK_DITEMUKAN');
}

function toShift(row: Record<string, unknown>): ShiftDefinition {
  return {
    id: String(row.id),
    name: String(row.name),
    start_time: String(row.start_time).slice(0, 5),
    end_time: String(row.end_time).slice(0, 5),
    crosses_midnight: Boolean(row.crosses_midnight),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    version: Number(row.version ?? 1),
  };
}

function toCategory(row: Record<string, unknown>): SopCategory {
  return {
    id: String(row.id),
    shift_definition_id: String(row.shift_definition_id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    version: Number(row.version ?? 1),
    color: normalizeSectionColor(row.color),
  };
}

function toPoint(row: Record<string, unknown>): ChecklistPoint {
  const inputTypes = normalizeInputTypes(row.input_types, 'boolean');
  return {
    id: String(row.id),
    sop_category_id: String(row.category_id),
    title: String(row.point_text),
    instruction: typeof row.instruction === 'string' ? row.instruction : null,
    input_type: inputTypes[0] ?? 'boolean',
    input_types: inputTypes,
    options: Array.isArray(row.options) ? row.options.map(String) : null,
    is_required: Boolean(row.is_required),
    target_time: typeof row.target_time === 'string' ? row.target_time.slice(0, 5) : null,
    tolerance_minutes: row.tolerance_minutes == null ? null : Number(row.tolerance_minutes),
    active_days: typeof row.active_days === 'string' ? row.active_days : null,
    number_min: row.number_min == null ? null : Number(row.number_min),
    number_max: row.number_max == null ? null : Number(row.number_max),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    points: Math.max(0, Number(row.weight_points ?? 1)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    version: Number(row.version ?? 1),
  };
}

function toHandoverField(row: Record<string, unknown>): HandoverField {
  const inputTypes = Array.isArray(row.input_types) && row.input_types.length
    ? row.input_types.map(String)
    : [String(row.field_type)];
  return {
    id: String(row.id),
    shift_definition_id: String(row.shift_definition_id),
    label: String(row.field_name),
    field_type: String(row.field_type),
    input_types: inputTypes,
    options: Array.isArray(row.options) ? row.options.map(String) : null,
    is_required: Boolean(row.is_required),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    version: Number(row.version ?? 1),
  };
}

function toIncidentCategory(row: Record<string, unknown>): IncidentCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    points: Math.max(0, Number(row.points ?? 0)),
    penalty_min_severity: String(row.penalty_min_severity ?? 'none'),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function listShiftDefinitions(branchId: string, _fresh = true): Promise<ShiftDefinition[]> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .select('*')
    .eq('branch_id', branchId)
    .order('sort_order');
  if (error) fail(error, 'shift list');
  return (data ?? []).map((row) => toShift(row));
}

export async function getShiftDefinition(branchId: string, id: string, _fresh = false): Promise<ShiftDefinition | null> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .select('*')
    .eq('branch_id', branchId)
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error, 'shift lookup');
  return data ? toShift(data) : null;
}

export async function createShiftDefinition(
  branchId: string,
  input: {
    name: string;
    start_time: string;
    end_time: string;
    crosses_midnight?: boolean;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<ShiftDefinition> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .insert({
      branch_id: branchId,
      name: input.name,
      start_time: input.start_time,
      end_time: input.end_time,
      crosses_midnight: input.crosses_midnight ?? false,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) fail(error, 'shift creation');
  return toShift(data);
}

export async function updateShiftDefinition(
  branchId: string,
  id: string,
  updates: Partial<Omit<ShiftDefinition, 'id' | 'created_at'>>
): Promise<void> {
  const current = await getShiftDefinition(branchId, id);
  if (!current) throw new Error('SHIFT_DEFINITION_TIDAK_DITEMUKAN');
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .update({ ...updates, updated_at: nowIso(), version: current.version + 1 })
    .eq('branch_id', branchId)
    .eq('id', id)
    .eq('version', current.version)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'shift update');
  if (!data) throw new Error('VERSION_CONFLICT');
}

export async function deleteShiftDefinition(branchId: string, id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('mycheck_shift_definitions')
    .delete()
    .eq('branch_id', branchId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'shift deletion');
  if (!data) throw new Error('SHIFT_DEFINITION_TIDAK_DITEMUKAN');
}

export async function duplicateShiftDefinition(branchId: string, sourceId: string): Promise<ShiftDefinition> {
  const source = await getShiftDefinition(branchId, sourceId);
  if (!source) throw new Error('SHIFT_DEFINITION_TIDAK_DITEMUKAN');
  const copy = await createShiftDefinition(branchId, { ...source, name: `${source.name} (copy)` });
  const categories = await listSopCategories(branchId, sourceId);
  for (const category of categories) {
    const newCategory = await createSopCategory(branchId, {
      shift_definition_id: copy.id,
      name: category.name,
      sort_order: category.sort_order,
      is_active: category.is_active,
      color: category.color,
    });
    for (const point of await listChecklistPoints(branchId, category.id)) {
      await createChecklistPoint(branchId, { ...point, sop_category_id: newCategory.id });
    }
  }
  for (const field of await listHandoverFields(branchId, sourceId)) {
    await createHandoverField(branchId, { ...field, shift_definition_id: copy.id });
  }
  return copy;
}

export async function copySopFromShift(
  sourceBranchId: string,
  sourceShiftId: string,
  targetBranchId: string,
  targetShiftId: string
): Promise<{ categoriesCopied: number; pointsCopied: number }> {
  await assertShiftInBranch(sourceBranchId, sourceShiftId);
  await assertShiftInBranch(targetBranchId, targetShiftId);
  let categoriesCopied = 0;
  let pointsCopied = 0;
  for (const category of await listSopCategories(sourceBranchId, sourceShiftId)) {
    if (!category.is_active) continue;
    const created = await createSopCategory(targetBranchId, {
      shift_definition_id: targetShiftId,
      name: category.name,
      sort_order: category.sort_order,
      is_active: true,
      color: category.color,
    });
    categoriesCopied++;
    for (const point of await listChecklistPoints(sourceBranchId, category.id)) {
      if (!point.is_active) continue;
      await createChecklistPoint(targetBranchId, {
        ...point,
        sop_category_id: created.id,
        is_active: true,
      });
      pointsCopied++;
    }
  }
  return { categoriesCopied, pointsCopied };
}

export async function shiftInstanceCount(branchId: string, shiftDefinitionId: string, _fresh = false): Promise<number> {
  const { count, error } = await getSupabase()
    .from('mycheck_shift_instances')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('shift_definition_id', shiftDefinitionId);
  if (error) fail(error, 'shift history count');
  return count ?? 0;
}

export async function listSopCategories(branchId: string, shiftDefinitionId: string, _fresh = true): Promise<SopCategory[]> {
  await assertShiftInBranch(branchId, shiftDefinitionId);
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .select('*')
    .eq('shift_definition_id', shiftDefinitionId)
    .order('sort_order');
  if (error) fail(error, 'category list');
  return (data ?? []).map((row) => toCategory(row));
}

export async function createSopCategory(
  branchId: string,
  input: { shift_definition_id: string; name: string; sort_order?: number; is_active?: boolean; color?: string | null }
): Promise<SopCategory> {
  await assertShiftInBranch(branchId, input.shift_definition_id);
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .insert({
      shift_definition_id: input.shift_definition_id,
      name: input.name,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      color: normalizeSectionColor(input.color),
    })
    .select('*')
    .single();
  if (error) fail(error, 'category creation');
  return toCategory(data);
}

export async function updateSopCategory(
  branchId: string,
  id: string,
  updates: Partial<Omit<SopCategory, 'id' | 'created_at' | 'shift_definition_id'>>
): Promise<void> {
  await assertCategoryInBranch(branchId, id);
  const { data: current, error: lookupError } = await getSupabase()
    .from('mycheck_sop_categories')
    .select('version')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) fail(lookupError, 'category lookup');
  if (!current) throw new Error('SOP_CATEGORY_TIDAK_DITEMUKAN');
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .update({ ...updates, updated_at: nowIso(), version: Number(current.version ?? 1) + 1 })
    .eq('id', id)
    .eq('version', current.version)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'category update');
  if (!data) throw new Error('VERSION_CONFLICT');
}

export async function deleteSopCategory(branchId: string, id: string): Promise<void> {
  await assertCategoryInBranch(branchId, id);
  const { data, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'category deletion');
  if (!data) throw new Error('SOP_CATEGORY_TIDAK_DITEMUKAN');
}

export async function duplicateSopCategory(branchId: string, sourceId: string): Promise<SopCategory> {
  await assertCategoryInBranch(branchId, sourceId);
  const { data: source, error } = await getSupabase()
    .from('mycheck_sop_categories')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle();
  if (error) fail(error, 'category lookup');
  if (!source) throw new Error('SOP_CATEGORY_TIDAK_DITEMUKAN');
  const copy = await createSopCategory(branchId, {
    shift_definition_id: source.shift_definition_id,
    name: `${source.name} (copy)`,
    sort_order: source.sort_order,
    is_active: source.is_active,
    color: source.color,
  });
  for (const point of await listChecklistPoints(branchId, sourceId)) {
    await createChecklistPoint(branchId, { ...point, sop_category_id: copy.id });
  }
  return copy;
}

export async function listChecklistPoints(branchId: string, categoryId: string, _fresh = true): Promise<ChecklistPoint[]> {
  await assertCategoryInBranch(branchId, categoryId);
  const { data, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order');
  if (error) fail(error, 'checklist point list');
  return (data ?? []).map((row) => toPoint(row));
}

export async function createChecklistPoint(
  branchId: string,
  input: Omit<ChecklistPoint, 'id' | 'created_at' | 'updated_at' | 'version'> & Partial<Pick<ChecklistPoint, 'version'>>
): Promise<ChecklistPoint> {
  await assertCategoryInBranch(branchId, input.sop_category_id);
  const inputTypes = input.input_types?.length ? input.input_types : [input.input_type || 'boolean'];
  const { data, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .insert({
      category_id: input.sop_category_id,
      point_text: input.title,
      instruction: input.instruction,
      input_types: inputTypes,
      options: input.options,
      is_required: input.is_required,
      target_time: input.target_time,
      tolerance_minutes: input.tolerance_minutes,
      active_days: input.active_days,
      number_min: input.number_min,
      number_max: input.number_max,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      weight_points: Math.max(0, input.points ?? 1),
    })
    .select('*')
    .single();
  if (error) fail(error, 'checklist point creation');
  return toPoint(data);
}

export async function updateChecklistPoint(
  branchId: string,
  id: string,
  updates: Partial<Omit<ChecklistPoint, 'id' | 'created_at' | 'sop_category_id'>>
): Promise<void> {
  const { data: current, error: lookupError } = await getSupabase()
    .from('mycheck_checklist_points')
    .select('id,category_id,version')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) fail(lookupError, 'checklist point lookup');
  if (!current) throw new Error('CHECKLIST_POINT_TIDAK_DITEMUKAN');
  await assertCategoryInBranch(branchId, current.category_id);
  const patch: Record<string, unknown> = {
    updated_at: nowIso(),
    version: Number(current.version ?? 1) + 1,
  };
  if (updates.title !== undefined) patch.point_text = updates.title;
  if (updates.instruction !== undefined) patch.instruction = updates.instruction;
  if (updates.input_types !== undefined || updates.input_type !== undefined) {
    patch.input_types = updates.input_types?.length ? updates.input_types : [updates.input_type ?? 'boolean'];
  }
  if (updates.options !== undefined) patch.options = updates.options;
  if (updates.is_required !== undefined) patch.is_required = updates.is_required;
  if (updates.target_time !== undefined) patch.target_time = updates.target_time;
  if (updates.tolerance_minutes !== undefined) patch.tolerance_minutes = updates.tolerance_minutes;
  if (updates.active_days !== undefined) patch.active_days = updates.active_days;
  if (updates.number_min !== undefined) patch.number_min = updates.number_min;
  if (updates.number_max !== undefined) patch.number_max = updates.number_max;
  if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;
  if (updates.is_active !== undefined) patch.is_active = updates.is_active;
  if (updates.points !== undefined) patch.weight_points = Math.max(0, updates.points);
  const { data, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .update(patch)
    .eq('id', id)
    .eq('version', current.version)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'checklist point update');
  if (!data) throw new Error('VERSION_CONFLICT');
}

export async function bulkUpdateChecklistPoints(
  branchId: string,
  items: { id: string; points: number }[]
): Promise<Set<string>> {
  const results = await Promise.all(items.map(async (item) => {
    try {
      await updateChecklistPoint(branchId, item.id, { points: item.points });
      return item.id;
    } catch (error) {
      if (error instanceof Error && error.message === 'CHECKLIST_POINT_TIDAK_DITEMUKAN') return null;
      throw error;
    }
  }));
  return new Set(results.filter((id): id is string => id !== null));
}

export async function deleteChecklistPoint(branchId: string, id: string): Promise<void> {
  const { data: point, error: lookupError } = await getSupabase()
    .from('mycheck_checklist_points')
    .select('id,category_id')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) fail(lookupError, 'checklist point lookup');
  if (!point) throw new Error('CHECKLIST_POINT_TIDAK_DITEMUKAN');
  await assertCategoryInBranch(branchId, point.category_id);
  const { data, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'checklist point deletion');
  if (!data) throw new Error('CHECKLIST_POINT_TIDAK_DITEMUKAN');
}

export async function listChecklistPointRefsInUse(branchId: string, _fresh = false): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from('mycheck_entries')
    .select('point_id,mycheck_shift_instances!inner(branch_id)')
    .eq('mycheck_shift_instances.branch_id', branchId)
    .not('point_id', 'is', null);
  if (error) fail(error, 'checklist history lookup');
  return new Set((data ?? []).map((row) => row.point_id).filter((id): id is string => Boolean(id)));
}

export async function checklistPointHasEntryHistory(branchId: string, pointId: string): Promise<boolean> {
  return (await listChecklistPointRefsInUse(branchId)).has(pointId);
}

export async function duplicateChecklistPoint(branchId: string, sourceId: string): Promise<ChecklistPoint> {
  const { data: source, error } = await getSupabase()
    .from('mycheck_checklist_points')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle();
  if (error) fail(error, 'checklist point lookup');
  if (!source) throw new Error('CHECKLIST_POINT_TIDAK_DITEMUKAN');
  await assertCategoryInBranch(branchId, source.category_id);
  return createChecklistPoint(branchId, { ...toPoint(source), sop_category_id: source.category_id });
}

export async function listIncidentCategories(branchId: string): Promise<IncidentCategory[]> {
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('*')
    .eq('branch_id', branchId)
    .order('sort_order');
  if (error) fail(error, 'incident category list');
  return (data ?? []).map((row) => toIncidentCategory(row));
}

export async function getIncidentCategory(branchId: string, id: string, _fresh = false): Promise<IncidentCategory | null> {
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .select('*')
    .eq('branch_id', branchId)
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error, 'incident category lookup');
  return data ? toIncidentCategory(data) : null;
}

export async function createIncidentCategory(
  branchId: string,
  input: { name: string; sort_order?: number; is_active?: boolean; points?: number; penalty_min_severity?: string }
): Promise<IncidentCategory> {
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .insert({
      branch_id: branchId,
      name: input.name,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      points: Math.max(0, input.points ?? 0),
      penalty_min_severity: input.penalty_min_severity ?? 'none',
    })
    .select('*')
    .single();
  if (error) fail(error, 'incident category creation');
  return toIncidentCategory(data);
}

export async function updateIncidentCategory(
  branchId: string,
  id: string,
  updates: Partial<Omit<IncidentCategory, 'id' | 'created_at'>>
): Promise<void> {
  const patch = { ...updates, updated_at: nowIso() };
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .update(patch)
    .eq('branch_id', branchId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'incident category update');
  if (!data) throw new Error('INCIDENT_CATEGORY_TIDAK_DITEMUKAN');
}

export async function deleteIncidentCategory(branchId: string, id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('mycheck_incident_categories')
    .delete()
    .eq('branch_id', branchId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'incident category deletion');
  if (!data) throw new Error('INCIDENT_CATEGORY_TIDAK_DITEMUKAN');
}

export async function listHandoverFields(branchId: string, shiftDefinitionId: string, _fresh = true): Promise<HandoverField[]> {
  await assertShiftInBranch(branchId, shiftDefinitionId);
  const { data, error } = await getSupabase()
    .from('mycheck_handover_fields')
    .select('*')
    .eq('shift_definition_id', shiftDefinitionId)
    .order('sort_order');
  if (error) fail(error, 'handover field list');
  return (data ?? []).map((row) => toHandoverField(row));
}

export async function createHandoverField(
  branchId: string,
  input: {
    shift_definition_id: string;
    label: string;
    field_type: string;
    input_types?: string[] | null;
    options?: string[] | null;
    is_required?: boolean;
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<HandoverField> {
  await assertShiftInBranch(branchId, input.shift_definition_id);
  const { data, error } = await getSupabase()
    .from('mycheck_handover_fields')
    .insert({
      shift_definition_id: input.shift_definition_id,
      field_name: input.label,
      field_type: input.field_type,
      input_types: input.input_types?.length ? input.input_types : [input.field_type],
      options: input.options?.length ? input.options : null,
      is_required: input.is_required ?? false,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) fail(error, 'handover field creation');
  return toHandoverField(data);
}

export async function updateHandoverField(
  branchId: string,
  id: string,
  updates: Partial<Omit<HandoverField, 'id' | 'created_at' | 'shift_definition_id'>>
): Promise<void> {
  const { data: current, error: lookupError } = await getSupabase()
    .from('mycheck_handover_fields')
    .select('version,shift_definition_id')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) fail(lookupError, 'handover field lookup');
  if (!current) throw new Error('HANDOVER_FIELD_TIDAK_DITEMUKAN');
  await assertShiftInBranch(branchId, current.shift_definition_id);
  const patch: Record<string, unknown> = {
    updated_at: nowIso(),
    version: Number(current.version ?? 1) + 1,
  };
  if (updates.label !== undefined) patch.field_name = updates.label;
  if (updates.field_type !== undefined) patch.field_type = updates.field_type;
  if (updates.input_types !== undefined) patch.input_types = updates.input_types.length ? updates.input_types : [updates.field_type ?? 'text'];
  if (updates.options !== undefined) patch.options = updates.options?.length ? updates.options : null;
  if (updates.is_required !== undefined) patch.is_required = updates.is_required;
  if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;
  if (updates.is_active !== undefined) patch.is_active = updates.is_active;
  const { data, error } = await getSupabase()
    .from('mycheck_handover_fields')
    .update(patch)
    .eq('id', id)
    .eq('version', current.version)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'handover field update');
  if (!data) throw new Error('VERSION_CONFLICT');
}

export async function deleteHandoverField(branchId: string, id: string): Promise<void> {
  const { data: current, error: lookupError } = await getSupabase()
    .from('mycheck_handover_fields')
    .select('shift_definition_id')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) fail(lookupError, 'handover field lookup');
  if (!current) throw new Error('HANDOVER_FIELD_TIDAK_DITEMUKAN');
  await assertShiftInBranch(branchId, current.shift_definition_id);
  const { data, error } = await getSupabase()
    .from('mycheck_handover_fields')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) fail(error, 'handover field deletion');
  if (!data) throw new Error('HANDOVER_FIELD_TIDAK_DITEMUKAN');
}

export async function templateChildCounts(
  branchId: string,
  shiftDefinitionId: string,
  _fresh = false
): Promise<{ categories: number; handover_fields: number }> {
  await assertShiftInBranch(branchId, shiftDefinitionId);
  const [categories, fields] = await Promise.all([
    getSupabase().from('mycheck_sop_categories').select('id', { count: 'exact', head: true }).eq('shift_definition_id', shiftDefinitionId),
    getSupabase().from('mycheck_handover_fields').select('id', { count: 'exact', head: true }).eq('shift_definition_id', shiftDefinitionId),
  ]);
  if (categories.error) fail(categories.error, 'category count');
  if (fields.error) fail(fields.error, 'handover field count');
  return { categories: categories.count ?? 0, handover_fields: fields.count ?? 0 };
}
