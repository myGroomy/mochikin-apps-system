import { getSupabase } from '../supabase';
import { findMyCheckIdentity } from '../supabase-identity';
import { verifyPin } from '../pin';

export async function verifyAdminPin(identifier: string, pin: string): Promise<string | null> {
  if (!pin) return 'PIN konfirmasi admin wajib diisi';

  const admin = await findMyCheckIdentity(identifier);
  if (!admin) return 'User admin tidak ditemukan';
  if (admin.status !== 'active') return 'Akun admin sedang tidak aktif';
  if (admin.role !== 'admin') return 'User ini bukan admin';
  if (!admin.pinHash || !verifyPin(pin, admin.pinHash)) return 'PIN konfirmasi admin salah';

  return null;
}

export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  let query = getSupabase()
    .from('people')
    .select('id', { count: 'exact', head: true })
    .in('role', ['admin', 'role_admin', 'super_admin'])
    .eq('status', 'active')
    .is('deleted_at', null);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { count, error } = await query;
  if (error) throw new Error(`Supabase active admin count failed: ${error.message}`);
  return count ?? 0;
}
