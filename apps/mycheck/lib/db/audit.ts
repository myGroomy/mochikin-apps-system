import { createHash } from 'crypto';
import { getSupabase } from '../supabase';

interface AuditEntry {
  actorId: string | null;
  action: string;
  objectType?: string;
  objectId?: string;
  branchId?: string;
  shiftInstanceId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

export function computeAuditHash(previousHash: string, entry: Record<string, unknown>): string {
  return createHash('sha256').update(previousHash + '|' + JSON.stringify(entry)).digest('hex');
}

export async function appendAuditLogFor(branchId: string, entry: AuditEntry): Promise<void> {
  const { error } = await getSupabase().rpc('mycheck_append_audit_log', {
    p_branch_id: branchId,
    p_entry: {
      actor_id: entry.actorId,
      action: entry.action,
      object_type: entry.objectType ?? null,
      object_id: entry.objectId ?? null,
      branch_id: entry.branchId ?? branchId,
      shift_instance_id: entry.shiftInstanceId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      reason: entry.reason ?? null,
    },
  });
  if (error) throw new Error(`Supabase audit append failed: ${error.message}`);
}

export async function appendAuditLog(branchId: string, entry: AuditEntry): Promise<void> {
  return appendAuditLogFor(branchId, entry);
}
