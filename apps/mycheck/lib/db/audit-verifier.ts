import { getSupabase } from '../supabase';
import { computeAuditHash } from './audit';

export interface AuditVerification {
  valid: boolean;
  checked: number;
  errors: string[];
}

function nullableJson(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function verifyAuditRows(rows: Record<string, unknown>[], anchor = ''): AuditVerification {
  const errors: string[] = [];
  let previous = anchor;
  rows.forEach((row, index) => {
    const payload = {
      at: String(row.at ?? ''),
      actor_id: String(row.actor_id ?? '') || null,
      action: String(row.action ?? ''),
      object_type: String(row.object_type ?? '') || null,
      object_id: String(row.object_id ?? '') || null,
      branch_id: String(row.branch_id ?? '') || null,
      shift_instance_id: String(row.shift_instance_id ?? '') || null,
      before: nullableJson(row.before),
      after: nullableJson(row.after),
      reason: String(row.reason ?? '') || null,
    };
    if (Number(row.seq) !== index + 1) errors.push(`seq tidak berurutan pada index ${index}: ${String(row.seq)}`);
    if (String(row.prev_hash ?? '') !== previous) errors.push(`prev_hash tidak cocok pada seq ${String(row.seq)}`);
    if (String(row.hash ?? '') !== computeAuditHash(previous, payload)) errors.push(`hash tidak cocok pada seq ${String(row.seq)}`);
    previous = String(row.hash ?? '');
  });
  return { valid: errors.length === 0, checked: rows.length, errors };
}

export async function verifyCurrentAuditChain(branchId: string): Promise<AuditVerification> {
  const { data, error } = await getSupabase().rpc('mycheck_verify_audit_chain', {
    p_branch_id: branchId,
  });
  if (error) throw new Error(`Supabase audit verification failed: ${error.message}`);
  if (!data || typeof data !== 'object') {
    throw new Error('Supabase audit verification returned an invalid response.');
  }
  const result = data as AuditVerification;
  if (typeof result.valid !== 'boolean' || typeof result.checked !== 'number' || !Array.isArray(result.errors)) {
    throw new Error('Supabase audit verification returned an invalid response.');
  }
  return result;
}
