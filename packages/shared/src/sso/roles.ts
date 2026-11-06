import type { UserRole } from '../types/auth';

/**
 * Map launcher role name or Supabase master-data role to myperformance UserRole enum.
 * Conservatively maps unknown roles to 'role_staff'.
 */
export function mapLauncherRoleToJwtRole(roleName?: string): UserRole {
  const r = String(roleName || '').toLowerCase().trim();
  if (r.includes('admin') || r.includes('super') || r.includes('owner') || r.includes('manager')) return 'admin';
  return 'petugas';
}
