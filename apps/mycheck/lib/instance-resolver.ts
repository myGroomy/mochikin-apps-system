import { AuthContext } from './api-auth';
import { getSupabase } from './supabase';
import { tabMonthOfDate } from './schema/periods';

export interface ResolvedInstance {
  instance: Record<string, unknown>;
  rowNumber: number;
  spreadsheetId: string;
  branchId: string;
  branchTimezone: string;
  tabMonth: string;
}

export function tabMonthOf(instance: Record<string, unknown>): string {
  const candidates = [
    String(instance['tab_month'] ?? '').trim(),
    String(instance['shift_date'] ?? '').trim().slice(0, 7),
  ];
  for (const candidate of candidates) {
    if (/^\d{4}-\d{2}$/.test(candidate)) return candidate;
  }
  return tabMonthOfDate();
}

export async function resolveInstance(
  ctx: AuthContext,
  shiftInstanceId: string
): Promise<ResolvedInstance | null> {
  const supabase = getSupabase();
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id,code,settings')
    .in('code', ctx.branchIds)
    .eq('status', 'active')
    .is('deleted_at', null);
  if (branchesError) throw new Error(`Supabase authorized branch lookup failed: ${branchesError.message}`);
  if (!branches?.length) return null;

  const { data: instance, error } = await supabase
    .from('mycheck_shift_instances')
    .select('*')
    .eq('id', shiftInstanceId)
    .in('branch_id', branches.map((branch) => branch.id))
    .maybeSingle();
  if (error) throw new Error(`Supabase shift lookup failed: ${error.message}`);
  if (!instance) return null;

  const branch = branches.find((item) => item.id === instance.branch_id);
  if (!branch) return null;
  const timezone = branch.settings && typeof branch.settings === 'object'
    ? (branch.settings as Record<string, unknown>).timezone
    : null;
  return {
    instance,
    rowNumber: 0,
    spreadsheetId: branch.id,
    branchId: branch.code,
    branchTimezone: typeof timezone === 'string' ? timezone : 'Asia/Jakarta',
    tabMonth: tabMonthOf(instance),
  };
}
