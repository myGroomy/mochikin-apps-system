import { getSupabase } from './supabase';

const ADMIN_ROLES = new Set(['admin', 'role_admin', 'super_admin']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MyCheckIdentity {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'petugas';
  status: string;
  pinHash: string | null;
  mustChangePin: boolean;
  branchCodes: string[];
}

export async function findMyCheckIdentity(identifier: string): Promise<MyCheckIdentity | null> {
  const supabase = getSupabase();
  const query = supabase
    .from('people')
    .select('id,username,name,role,pin_hash,status,must_change_pin,deleted_at')
    .is('deleted_at', null);
  const { data: person, error } = UUID_PATTERN.test(identifier)
    ? await query.eq('id', identifier).maybeSingle()
    : await query.ilike('username', identifier.replace(/[\\%_]/g, '\\$&')).maybeSingle();

  if (error) throw new Error(`Supabase identity lookup failed: ${error.message}`);
  if (!person) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from('branch_members')
    .select('branches!inner(code,status,deleted_at)')
    .eq('person_id', person.id)
    .eq('is_active', true);
  if (membershipError) throw new Error(`Supabase branch membership lookup failed: ${membershipError.message}`);

  const branchCodes = (memberships ?? [])
    .map((membership) => {
      const branch = membership.branches;
      const activeBranch = Array.isArray(branch) ? branch[0] : branch;
      return activeBranch?.status === 'active' && !activeBranch.deleted_at
        ? activeBranch.code
        : null;
    })
    .filter((code): code is string => Boolean(code));

  return {
    id: person.id,
    username: person.username ?? '',
    name: person.name ?? '',
    role: ADMIN_ROLES.has(person.role) ? 'admin' : 'petugas',
    status: person.status,
    pinHash: person.pin_hash,
    mustChangePin: person.must_change_pin ?? false,
    branchCodes,
  };
}

export async function getActiveBranch(code: string): Promise<{ id: string; code: string } | null> {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('id,code')
    .eq('code', code)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Supabase branch lookup failed: ${error.message}`);
  return data;
}

export async function getActiveBranchCodes(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('branches')
    .select('code')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('code');
  if (error) throw new Error(`Supabase branch list failed: ${error.message}`);
  return (data ?? []).map((branch) => branch.code).filter((code): code is string => Boolean(code));
}
