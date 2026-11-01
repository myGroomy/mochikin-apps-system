import type { UserRole } from '../types/auth';

/**
 * Map launcher role name or Supabase master-data role to myperformance UserRole enum.
 * Conservatively maps unknown roles to 'role_staff'.
 */
export function mapLauncherRoleToJwtRole(roleName?: string): UserRole {
  const r = String(roleName || '').toLowerCase().trim();
  if (r.includes('super')) return 'super_admin';
  if (r.includes('admin')) return 'role_admin';
  if (r.includes('manager')) return 'role_manager';
  if (r.includes('captain') || r.includes('kapten')) return 'role_captain';
  return 'role_staff';
}
