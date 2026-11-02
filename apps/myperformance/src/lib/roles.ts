/**
 * Role model shared by server routes and client components.
 *
 * Two vocabularies exist in this codebase:
 *  - SSO/JWT roles: role_staff | role_captain | role_manager | role_admin | super_admin
 *  - legacy `people.role` values: staff | branch_manager | super_admin | ...
 *
 * `normalizeRole` collapses both into the JWT vocabulary so the UI never has
 * to reason about which source the role came from.
 */

export type UserRole =
  | 'role_staff'
  | 'role_captain'
  | 'role_manager'
  | 'role_admin'
  | 'super_admin';

export const USER_ROLES: UserRole[] = [
  'role_staff',
  'role_captain',
  'role_manager',
  'role_admin',
  'super_admin',
];

export interface RoleMeta {
  label: string;
  shortLabel: string;
  /** Copy shown next to the role badge, oriented to what the person can do. */
  scope: string;
  /** staff = personal workspace, lead = team visibility, admin = full control */
  tier: 'staff' | 'lead' | 'admin';
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  role_staff: {
    label: 'Petugas',
    shortLabel: 'Petugas',
    scope: 'Ruang pribadi · penilaian rekan',
    tier: 'staff',
  },
  role_captain: {
    label: 'Kapten',
    shortLabel: 'Kapten',
    scope: 'Ruang tim · pantau performa cabang',
    tier: 'lead',
  },
  role_manager: {
    label: 'Manajer',
    shortLabel: 'Manajer',
    scope: 'Ruang tim · kelola sesi scorecard',
    tier: 'lead',
  },
  role_admin: {
    label: 'Admin',
    shortLabel: 'Admin',
    scope: 'Kontrol penuh · audit & kelola',
    tier: 'admin',
  },
  super_admin: {
    label: 'Super Admin',
    shortLabel: 'Super',
    scope: 'Kontrol penuh · lintas cabang',
    tier: 'admin',
  },
};

export function normalizeRole(role?: string | null): UserRole {
  const value = String(role ?? '').trim().toLowerCase();

  if (USER_ROLES.includes(value as UserRole)) return value as UserRole;

  if (value === 'branch_manager' || value === 'manager') return 'role_manager';
  if (value === 'captain' || value === 'kapten') return 'role_captain';
  if (value === 'staff' || value === 'guest' || value === 'employee') return 'role_staff';
  if (value === 'admin' || value === 'owner') return 'role_admin';

  return 'role_staff';
}

export interface RoleCapabilities {
  isStaff: boolean;
  isCaptain: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Can see every person's points/scores, not just their own. */
  canViewTeamInsights: boolean;
  /** Can open, close, and audit scorecard sessions. */
  canManageScorecards: boolean;
  /** Can see feedback text and evaluator detail. */
  canViewScorecardDetail: boolean;
  /** Can act on cross-branch data. */
  canViewAllBranches: boolean;
}

export function getRoleCapabilities(role?: string | null): RoleCapabilities {
  const normalized = normalizeRole(role);
  const isAdmin = normalized === 'role_admin' || normalized === 'super_admin';
  const isSuperAdmin = normalized === 'super_admin';
  const isManager = normalized === 'role_manager';
  const isCaptain = normalized === 'role_captain';

  return {
    isStaff: normalized === 'role_staff',
    isCaptain,
    isManager,
    isAdmin,
    isSuperAdmin,
    canViewTeamInsights: isAdmin || isManager || isCaptain,
    canManageScorecards: isAdmin || isManager,
    canViewScorecardDetail: isAdmin,
    canViewAllBranches: isSuperAdmin,
  };
}

export function roleMeta(role?: string | null): RoleMeta {
  return ROLE_META[normalizeRole(role)];
}

export function isPrivilegedRole(role?: string | null): boolean {
  return getRoleCapabilities(role).canViewTeamInsights;
}

export function isAdminRole(role?: string | null): boolean {
  return getRoleCapabilities(role).isAdmin;
}
