export type AppStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export interface AppManifestInfo {
  version?: string;
  category?: string;
  title?: string;
  depends?: string[];
  provides?: string[];
  description?: string;
}

export interface App extends AppManifestInfo {
  app_id: string;
  name: string;
  url: string;
  icon: string;
  status: AppStatus;
  required_permission: string;
}

export interface Employee {
  employee_id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  base_branch: string;
}

export interface Role {
  role_id: string;
  name: string;
  permissions: string[];
}

export interface Permission {
  permission_id: string;
  key: string;
  description: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  employeeId: string | null;
  details: string;
}

export interface AdminSessionInfo {
  session_id: string;
  employee_id: string;
  role_id: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string;
  active: boolean;
}

export interface Branch {
  branch_id: string;
  name: string;
}

export interface Shift {
  shift_id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleEntry {
  schedule_id: string;
  employee_id: string;
  date: string;
  branch_id: string;
  shift_id: string;
  updated_via?: "schedule" | "swap" | "replacement";
}

export interface WorkContext {
  employee_id: string;
  date: string;
  branch: Branch | null;
  shift: Shift | null;
  schedule: ScheduleEntry | null;
}

export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  status: "ACTIVE" | "ARCHIVED";
  audience: string;
  created_at: string;
  created_by: string;
  expires_at: string;
}

export interface NotificationItem {
  notification_id: string;
  employee_id: string;
  title: string;
  body: string;
  type: string;
  link: string;
  created_at: string;
  read_at: string;
}

export interface HomeFeed {
  announcements: Announcement[];
  notifications: NotificationItem[];
  activity: AuditLogEntry[];
}

export const FEATURE_KEYS = [
  "global_search",
  "notifications",
  "work_context",
  "announcements",
  "favorite_apps",
  "recent_apps",
  "system_status",
  "recent_activity",
  "admin_roles",
  "admin_permissions",
  "admin_apps",
  "admin_announcements",
  "admin_sessions",
  "admin_audit",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureSettings = Record<FeatureKey, boolean>;
