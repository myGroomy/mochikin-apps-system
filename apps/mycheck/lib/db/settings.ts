import { getSupabase } from '../supabase';

export async function listGlobalSettings() {
  const { data, error } = await getSupabase()
    .from('mycheck_app_settings')
    .select('key,value,updated_by,updated_at');
  if (error) throw new Error(`Supabase settings read failed: ${error.message}`);
  return data ?? [];
}

export async function writeGlobalSettings(
  updates: { key: string; value: string; updatedBy: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const { error } = await getSupabase()
    .from('mycheck_app_settings')
    .upsert(updates.map(({ key, value, updatedBy }) => ({
      key,
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })), { onConflict: 'key' });
  if (error) throw new Error(`Supabase settings write failed: ${error.message}`);
}
