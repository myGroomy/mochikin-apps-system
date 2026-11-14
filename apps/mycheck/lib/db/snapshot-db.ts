// lib/db/snapshot-db.ts
// Baca template snapshot dari Supabase mycheck_* tables.
// Return null bila Supabase tidak tersedia atau data belum di-seed.
import { getSupabase } from '../supabase';
import type { Snapshot } from './snapshot';

export async function buildTemplateSnapshotFromDb(
  branchId: string,
  shiftDefinitionId: string,
  timezone: string
): Promise<Snapshot | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    // Resolve shift definition — coba by UUID langsung dulu
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shiftDefinitionId);
    let defId = isUuid ? shiftDefinitionId : null;

    if (!defId) {
      // shiftDefinitionId bukan UUID (Sheets string), cari via branch code
      const { data: br } = await supabase.from('branches').select('id').eq('code', branchId).maybeSingle();
      if (!br) return null;
      const { data: def } = await supabase
        .from('mycheck_shift_definitions')
        .select('id')
        .eq('branch_id', br.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!def) return null;
      defId = def.id;
    }

    const { data: shiftDef } = await supabase
      .from('mycheck_shift_definitions')
      .select('id,name,start_time,end_time,crosses_midnight')
      .eq('id', defId)
      .maybeSingle();
    if (!shiftDef) return null;

    const { data: cats } = await supabase
      .from('mycheck_sop_categories')
      .select('id,name,color,sort_order')
      .eq('shift_definition_id', defId)
      .eq('is_active', true)
      .order('sort_order');

    const catIds = (cats ?? []).map((c) => c.id);
    const { data: points } = catIds.length
      ? await supabase
          .from('mycheck_checklist_points')
          .select('id,category_id,point_text,input_types,options,weight_points,is_required,sort_order')
          .in('category_id', catIds)
          .eq('is_active', true)
          .order('sort_order')
      : { data: [] };

    const { data: hoFields } = await supabase
      .from('mycheck_handover_fields')
      .select('id,field_name,field_type,is_required,sort_order')
      .eq('shift_definition_id', defId)
      .eq('is_active', true)
      .order('sort_order');

    const snapshot: Snapshot = {
      v: 2,
      score_version: 'weighted-v1',
      shift: {
        id: shiftDef.id,
        name: shiftDef.name,
        start_time: String(shiftDef.start_time),
        end_time: String(shiftDef.end_time),
        crosses_midnight: shiftDef.crosses_midnight ?? false,
      },
      settings: { tolerance_default_minutes: 15, timezone },
      categories: (cats ?? []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        sort_order: cat.sort_order ?? 0,
        color: cat.color ?? '#059669',
        points: (points ?? [])
          .filter((p) => p.category_id === cat.id)
          .map((p) => {
            const inputTypes: string[] = Array.isArray(p.input_types) && p.input_types.length
              ? p.input_types
              : ['boolean'];
            return {
              point_ref: p.id,
              title: p.point_text,
              instruction: null,
              input_type: inputTypes[0],
              input_types: inputTypes,
              options: Array.isArray(p.options) && p.options.length ? p.options : null,
              is_required: p.is_required ?? true,
              target_time: null,
              tolerance_minutes: null,
              active_days: null,
              number_min: null,
              number_max: null,
              sort_order: p.sort_order ?? 0,
              points: Math.max(0, Number(p.weight_points ?? 1)),
            };
          }),
      })),
      incident_categories: [],
      handover_fields: (hoFields ?? []).map((f) => ({
        id: f.id,
        label: f.field_name,
        field_type: f.field_type,
        input_types: [f.field_type],
        options: null,
        is_required: f.is_required ?? false,
        sort_order: f.sort_order ?? 0,
      })),
    };

    return snapshot;
  } catch {
    return null;
  }
}
