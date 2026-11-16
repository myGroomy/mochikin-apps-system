import { getServerTime } from './db/server-time';
import { getSupabase } from './supabase';

async function personId(userId: string): Promise<string> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  const { data, error } = await getSupabase()
    .from('people')
    .select('id')
    .eq(isUuid ? 'id' : 'username', userId)
    .maybeSingle();
  if (error) throw new Error(`Supabase PJ lookup failed: ${error.message}`);
  if (!data) throw new Error(`PJ user not found: ${userId}`);
  return data.id;
}

export async function recordPjAssignment(
  _branchId: string,
  shiftInstanceId: string,
  userId: string,
  source: 'open' | 'change_pj'
): Promise<void> {
  const { error } = await getSupabase().from('mycheck_pj_assignments').insert({
    shift_instance_id: shiftInstanceId,
    user_id: await personId(userId),
    started_at: getServerTime().toISOString(),
    source,
  });
  if (error) throw new Error(`Supabase PJ assignment creation failed: ${error.message}`);
}

export async function endActivePjAssignments(
  _branchId: string,
  shiftInstanceId: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('mycheck_pj_assignments')
    .update({ ended_at: getServerTime().toISOString(), is_current: false })
    .eq('shift_instance_id', shiftInstanceId)
    .eq('is_current', true);
  if (error) throw new Error(`Supabase PJ assignment update failed: ${error.message}`);
}
