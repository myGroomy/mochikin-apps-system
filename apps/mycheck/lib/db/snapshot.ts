import { createHash } from 'crypto';
import { normalizeSectionColor } from '../shared/section-color';
import { getSupabase } from '../supabase';

interface SnapshotPoint {
  point_ref: string;
  title: string;
  instruction: string | null;
  input_type: string;
  input_types?: string[];
  options?: string[] | null;
  is_required: boolean;
  target_time: string | null;
  tolerance_minutes: number | null;
  active_days: string | null;
  number_min: number | null;
  number_max: number | null;
  sort_order: number;
  points?: number;
}

export interface SnapshotCategory {
  id: string;
  name: string;
  sort_order: number;
  color?: string | null;
  points: SnapshotPoint[];
}

export interface Snapshot {
  v: number;
  score_version?: string;
  shift: { id: string; name: string; start_time: string; end_time: string; crosses_midnight: boolean };
  settings: { tolerance_default_minutes: number; timezone: string };
  categories: SnapshotCategory[];
  incident_categories?: { id: string; name: string; points: number; penalty_min_severity: string; is_active: boolean }[];
  handover_fields: { id: string; label: string; field_type: string; input_types?: string[]; options: string[] | null; is_required: boolean; sort_order: number }[];
}

export function hashSnapshot(snapshot: Snapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export async function buildTemplateSnapshot(
  branchId: string,
  shiftDefinitionId: string,
  timezone: string
): Promise<Snapshot> {
  const supabase = getSupabase();
  const { data: shift, error: shiftError } = await supabase
    .from('mycheck_shift_definitions')
    .select('id,name,start_time,end_time,crosses_midnight')
    .eq('branch_id', branchId)
    .eq('id', shiftDefinitionId)
    .maybeSingle();
  if (shiftError) throw new Error(`Supabase shift definition lookup failed: ${shiftError.message}`);
  if (!shift) throw new Error(`Shift definition ${shiftDefinitionId} tidak ditemukan`);

  const { data: categories, error: categoryError } = await supabase
    .from('mycheck_sop_categories')
    .select('id,name,color,sort_order')
    .eq('shift_definition_id', shiftDefinitionId)
    .eq('is_active', true)
    .order('sort_order');
  if (categoryError) throw new Error(`Supabase SOP category lookup failed: ${categoryError.message}`);
  const categoryIds = (categories ?? []).map((category) => category.id);

  const [pointsResult, handoverResult, incidentsResult, settingResult] = await Promise.all([
    categoryIds.length
      ? supabase.from('mycheck_checklist_points')
        .select('id,category_id,point_text,instruction,input_types,options,is_required,target_time,tolerance_minutes,active_days,number_min,number_max,sort_order,weight_points')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    supabase.from('mycheck_handover_fields')
      .select('id,field_name,field_type,input_types,options,is_required,sort_order')
      .eq('shift_definition_id', shiftDefinitionId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('mycheck_incident_categories')
      .select('id,name,points,penalty_min_severity,is_active')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('mycheck_app_settings')
      .select('value')
      .eq('key', 'tolerance_default_minutes')
      .maybeSingle(),
  ]);
  if (pointsResult.error) throw new Error(`Supabase checklist point lookup failed: ${pointsResult.error.message}`);
  if (handoverResult.error) throw new Error(`Supabase handover field lookup failed: ${handoverResult.error.message}`);
  if (incidentsResult.error) throw new Error(`Supabase incident category lookup failed: ${incidentsResult.error.message}`);
  if (settingResult.error) throw new Error(`Supabase template setting lookup failed: ${settingResult.error.message}`);

  const parsedTolerance = Number.parseInt(settingResult.data?.value ?? '', 10);
  const toleranceDefault = Number.isFinite(parsedTolerance) && parsedTolerance > 0 ? parsedTolerance : 15;
  const points = pointsResult.data ?? [];
  return {
    v: 2,
    score_version: 'weighted-v1',
    shift: {
      id: shift.id,
      name: shift.name,
      start_time: String(shift.start_time).slice(0, 5),
      end_time: String(shift.end_time).slice(0, 5),
      crosses_midnight: shift.crosses_midnight,
    },
    settings: { tolerance_default_minutes: toleranceDefault, timezone },
    categories: (categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      sort_order: category.sort_order,
      color: normalizeSectionColor(category.color),
      points: points.filter((point) => point.category_id === category.id).map((point) => {
        const inputTypes = point.input_types?.length ? point.input_types : ['boolean'];
        return {
          point_ref: point.id,
          title: point.point_text,
          instruction: point.instruction,
          input_type: inputTypes[0],
          input_types: inputTypes,
          options: point.options,
          is_required: point.is_required,
          target_time: point.target_time ? String(point.target_time).slice(0, 5) : null,
          tolerance_minutes: point.tolerance_minutes,
          active_days: point.active_days,
          number_min: point.number_min === null ? null : Number(point.number_min),
          number_max: point.number_max === null ? null : Number(point.number_max),
          sort_order: point.sort_order,
          points: Math.max(0, Number(point.weight_points)),
        };
      }),
    })),
    incident_categories: (incidentsResult.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      points: Math.max(0, Number(category.points)),
      penalty_min_severity: category.penalty_min_severity || 'none',
      is_active: category.is_active,
    })),
    handover_fields: (handoverResult.data ?? []).map((field) => ({
      id: field.id,
      label: field.field_name,
      field_type: field.field_type,
      input_types: field.input_types?.length ? field.input_types : [field.field_type],
      options: field.options,
      is_required: field.is_required,
      sort_order: field.sort_order,
    })),
  };
}
