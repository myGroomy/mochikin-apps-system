export type PointMasterAppId = 'mycheck' | 'stokis' | 'mycustomer';
export type PointMasterEntityType = 'checklist_item' | 'incident_category' | 'master_item' | 'branch_config';
export type PointMasterAction = 'set' | 'reset' | 'bulk_split';

export interface PointMasterChangeRecord {
  app_id: PointMasterAppId;
  entity_type: PointMasterEntityType;
  entity_ref: string;
  entity_label?: string | null;
  old_points: number | null;
  new_points: number;
  action: PointMasterAction;
  reason?: string | null;
  changed_by: string;
  changed_at?: string;
}

export interface MasterPointValidationResult {
  valid: boolean;
  value: number;
  error?: string;
}

/**
 * Validates a point value for master items/activities.
 * Ensures the value is a valid non-negative number within allowed range
 * and does not exceed the allowed decimal precision (default 2 places).
 */
export function validateMasterPoints(
  value: unknown,
  options?: { max?: number; decimals?: number }
): MasterPointValidationResult {
  const max = options?.max ?? 1000;
  const maxDecimals = options?.decimals ?? 2;

  if (value === null || value === undefined || value === '') {
    return { valid: false, value: 0, error: 'Nilai poin wajib diisi' };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Poin harus berupa angka yang valid' };
  }

  if (num < 0) {
    return { valid: false, value: num, error: 'Poin tidak boleh bernilai negatif' };
  }

  if (num > max) {
    return { valid: false, value: num, error: `Poin maksimal adalah ${max}` };
  }

  // Check decimal precision
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  if (Math.abs(num - rounded) > 1e-9) {
    return {
      valid: false,
      value: num,
      error: `Poin maksimal memiliki ${maxDecimals} angka di belakang koma`,
    };
  }

  return { valid: true, value: rounded };
}

/**
 * Sums an array of points accurately without floating-point artifacts.
 * Treats null, undefined, or empty as 0. NEVER defaults 0 to 1.
 */
export function sumPoints(
  values: (number | null | undefined)[],
  options?: { decimals?: number }
): number {
  if (!values || values.length === 0) return 0;
  const decimals = options?.decimals ?? 2;
  const factor = Math.pow(10, decimals);

  const totalUnits = values.reduce<number>((sum, val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return sum;
    const num = Math.max(0, Number(val));
    return sum + Math.round(num * factor);
  }, 0);

  return Number((totalUnits / factor).toFixed(decimals));
}

/**
 * Builds a validated change record for auditing master point modifications.
 */
export function buildChangeRecord(params: {
  appId: PointMasterAppId;
  entityType: PointMasterEntityType;
  entityRef: string;
  entityLabel?: string | null;
  oldPoints: number | null | undefined;
  newPoints: number;
  action: PointMasterAction;
  reason?: string | null;
  changedBy: string;
}): PointMasterChangeRecord {
  return {
    app_id: params.appId,
    entity_type: params.entityType,
    entity_ref: String(params.entityRef),
    entity_label: params.entityLabel ?? null,
    old_points: params.oldPoints !== null && params.oldPoints !== undefined ? Number(params.oldPoints) : null,
    new_points: Number(params.newPoints),
    action: params.action,
    reason: params.reason ?? null,
    changed_by: params.changedBy,
  };
}

/**
 * Logs a master point change record to `point_master_changes` in Supabase.
 */
export async function logPointMasterChange(
  supabase: any,
  record: PointMasterChangeRecord
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('point_master_changes').insert({
      app_id: record.app_id,
      entity_type: record.entity_type,
      entity_ref: String(record.entity_ref),
      entity_label: record.entity_label ?? null,
      old_points: record.old_points !== null && record.old_points !== undefined ? Number(record.old_points) : null,
      new_points: Number(record.new_points),
      action: record.action,
      reason: record.reason ?? null,
      changed_by: record.changed_by,
    });

    if (error) {
      console.error('[logPointMasterChange] Supabase insert error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('[logPointMasterChange] Exception caught:', err);
    return { ok: false, error: err?.message || 'Gagal mencatat riwayat perubahan master poin' };
  }
}
