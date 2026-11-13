import type { UserRole } from '../types/auth';

/**
 * Map launcher role name or Supabase master-data role to myperformance UserRole enum.
 * Conservatively maps unknown roles to 'role_staff'.
 */
export function mapLauncherRoleToJwtRole(roleName?: string): UserRole {
  const r = String(roleName || '').toLowerCase().trim();
  if (r === 'super_admin' || r.includes('owner') || r.includes('super')) return 'super_admin';
  if (r === 'role_admin' || r === 'admin') return 'role_admin';
  if (r === 'role_manager' || r === 'branch_manager' || r.includes('manager')) return 'role_manager';
  if (r === 'role_captain' || r.includes('captain') || r.includes('spv') || r.includes('supervisor')) return 'role_captain';
  return 'role_staff';
}
