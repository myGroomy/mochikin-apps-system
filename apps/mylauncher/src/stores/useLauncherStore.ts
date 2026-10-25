import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { App, Employee, Role, Permission, AuditLogEntry, Branch, Shift, ScheduleEntry, WorkContext } from "@/lib/types";

export interface SessionUser {
  employee: Employee;
  roleId: string;
  roleName: string;
  permissions: string[];
  expiresAt: number;
}

function genId(prefix = "log"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface AuthState {
  isAuthenticated: boolean;
  employeeId: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  sessionExpiry: number | null;
}

interface DomainState extends AuthState {
  apps: App[];
  employees: Employee[];
  roles: Role[];
  permissionsCatalog: Permission[];
  branches: Branch[];
  shifts: Shift[];
  schedules: ScheduleEntry[];
  activeEmployee: Employee | null;
  auditLog: AuditLogEntry[];
  favorites: string[];
  recentApps: string[];
  dismissedAnnouncements: string[];

  hydrateSession: (session: SessionUser) => void;
  setApps: (apps: App[]) => void;
  logout: () => void;
  getAccessibleApps: () => App[];
  getSession: () => { expiresAt: number | null; isValid: boolean };
  hasPermission: (key: string) => boolean;
  getEmployeeById: (id: string) => Employee | undefined;
  getAuditLog: () => AuditLogEntry[];
  updateRole: (roleId: string, permissions: string[]) => void;
  updateEmployeeRole: (employeeId: string, role: string) => void;
  getWorkContext: () => WorkContext;
  getCurrentDate: () => string;
  toggleFavorite: (appId: string) => void;
  pushRecentApp: (appId: string) => void;
  dismissAnnouncement: (announcementId: string) => void;

  // Employee CRUD
  createEmployee: (employee: Omit<Employee, "employee_id"> & { employee_id?: string }) => { success: boolean; message: string };
  updateEmployee: (employeeId: string, updates: Partial<Omit<Employee, "employee_id">>) => { success: boolean; message: string };
  findEmployeeByUsername: (username: string) => Employee | undefined;
  toggleEmployeeStatus: (employeeId: string) => void;
  resetEmployeePin: (employeeId: string) => { success: boolean; message: string };

  // Role CRUD
  createRole: (role: Omit<Role, "role_id"> & { role_id?: string }) => { success: boolean; message: string };
  deleteRole: (roleId: string) => void;

  // Permission CRUD
  createPermission: (permission: Omit<Permission, "permission_id"> & { permission_id?: string }) => { success: boolean; message: string };
  deletePermission: (permissionKey: string) => void;

  // App management
  createApp: (app: Omit<App, "app_id"> & { app_id?: string }) => { success: boolean; message: string };
  updateApp: (appId: string, updates: Partial<Omit<App, "app_id">>) => { success: boolean; message: string };
  deleteApp: (appId: string) => void;

  // Session management
  revokeSession: () => void;
}

const MOCK_PERMISSIONS: Permission[] = [
  { permission_id: "perm_stokis", key: "view_stokis", description: "Access Stokis application" },
  { permission_id: "perm_myshift", key: "view_myshift", description: "Access Myshift application" },
  { permission_id: "perm_mycustomer", key: "view_mycustomer", description: "Access Mycustomer application" },
  { permission_id: "perm_myhr", key: "view_myhr", description: "Access Myhr application" },
];

const MOCK_ROLES: Role[] = [
  { role_id: "role_admin", name: "Admin", permissions: MOCK_PERMISSIONS.map((p) => p.key) },
  { role_id: "role_user", name: "User", permissions: ["view_stokis", "view_myshift"] },
  { role_id: "role_viewer", name: "Viewer", permissions: ["view_stokis"] },
];

const MOCK_BRANCHES: Branch[] = [
  { branch_id: "branch_cibiru", name: "Cibiru" },
  { branch_id: "branch_antapani", name: "Antapani" },
  { branch_id: "branch_cimahi", name: "Cimahi" },
];

const MOCK_SHIFTS: Shift[] = [
  { shift_id: "shift_morning", name: "Morning", start_time: "06:00", end_time: "14:00" },
  { shift_id: "shift_afternoon", name: "Afternoon", start_time: "14:00", end_time: "22:00" },
  { shift_id: "shift_evening", name: "Evening", start_time: "10:00", end_time: "18:00" },
];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MOCK_SCHEDULES: ScheduleEntry[] = [
  { schedule_id: "sch_001", employee_id: "emp_001", date: today(), branch_id: "branch_cibiru", shift_id: "shift_afternoon", updated_via: "schedule" },
  { schedule_id: "sch_002", employee_id: "emp_002", date: today(), branch_id: "branch_antapani", shift_id: "shift_morning", updated_via: "swap" },
  { schedule_id: "sch_003", employee_id: "emp_003", date: today(), branch_id: "branch_cimahi", shift_id: "shift_evening", updated_via: "replacement" },
];

const MOCK_EMPLOYEES: Employee[] = [
  { employee_id: "emp_001", username: "admin", name: "Admin User", role: "role_admin", status: "ACTIVE", base_branch: "branch_cibiru" },
  { employee_id: "emp_002", username: "crew", name: "Regular User", role: "role_user", status: "ACTIVE", base_branch: "branch_antapani" },
  { employee_id: "emp_003", username: "viewer", name: "Read Only", role: "role_viewer", status: "ACTIVE", base_branch: "branch_cimahi" },
];

function addLog(state: DomainState, action: string, employeeId: string | null, details: string): AuditLogEntry[] {
  const entry: AuditLogEntry = { id: genId(), timestamp: Date.now(), action, employeeId, details };
  return [...state.auditLog, entry];
}

export const useDomainStore = create<DomainState>()(
  persist(
    (set, get) => ({
      apps: [
        { app_id: "STOKIS", name: "Stokis", url: "https://stokis-project.vercel.app", icon: "package", status: "ACTIVE" as const, required_permission: "view_stokis" },
        { app_id: "MYSHIFT", name: "Myshift", url: "", icon: "calendar-days", status: "INACTIVE" as const, required_permission: "view_myshift" },
        { app_id: "MYCUSTOMER", name: "Mycustomer", url: "https://retain-ly.vercel.app", icon: "users", status: "ACTIVE" as const, required_permission: "view_mycustomer" },
        { app_id: "MYHR", name: "Myhr", url: "", icon: "building-columns", status: "INACTIVE" as const, required_permission: "view_myhr" },
      ],
      employees: MOCK_EMPLOYEES,
      roles: MOCK_ROLES,
      permissionsCatalog: MOCK_PERMISSIONS,
      branches: MOCK_BRANCHES,
      shifts: MOCK_SHIFTS,
      schedules: MOCK_SCHEDULES,
      activeEmployee: null,
      isAuthenticated: false,
      employeeId: null,
      roleId: null,
      roleName: null,
      permissions: [],
      sessionExpiry: null,
      auditLog: [],
      favorites: [],
      recentApps: [],
      dismissedAnnouncements: [],

      hydrateSession: (session) => {
        set({
          isAuthenticated: true,
          employeeId: session.employee.employee_id,
          roleId: session.roleId,
          roleName: session.roleName,
          permissions: session.permissions,
          sessionExpiry: session.expiresAt,
          activeEmployee: session.employee,
          employees: get().employees.some((item) => item.employee_id === session.employee.employee_id)
            ? get().employees.map((item) => item.employee_id === session.employee.employee_id ? { ...item, ...session.employee } : item)
            : [...get().employees, session.employee],
        });
      },

      setApps: (apps) => set({ apps }),

      logout: () => {
        const state = get();
        set({
          isAuthenticated: false,
          employeeId: null,
          activeEmployee: null,
          roleId: null,
          roleName: null,
          permissions: [],
          sessionExpiry: null,
          auditLog: addLog(state, "LOGOUT", state.employeeId, "Session terminated"),
          favorites: [],
          recentApps: [],
          dismissedAnnouncements: [],
        });
      },

      revokeSession: () => {
        const state = get();
        set({
          isAuthenticated: false,
          roleId: null,
          roleName: null,
          permissions: [],
          sessionExpiry: null,
          auditLog: addLog(state, "SESSION_REVOKED", state.employeeId, "Session manually revoked"),
          favorites: [],
          recentApps: [],
          dismissedAnnouncements: [],
        });
      },

      toggleFavorite: (appId) => {
        const { favorites } = get();
        set({
          favorites: favorites.includes(appId)
            ? favorites.filter((id) => id !== appId)
            : [...favorites, appId],
        });
      },

      pushRecentApp: (appId) => {
        const { recentApps } = get();
        const next = [appId, ...recentApps.filter((id) => id !== appId)].slice(0, 8);
        set({ recentApps: next });
      },

      dismissAnnouncement: (announcementId) => {
        const { dismissedAnnouncements } = get();
        if (dismissedAnnouncements.includes(announcementId)) return;
        set({ dismissedAnnouncements: [...dismissedAnnouncements, announcementId].slice(-50) });
      },

      getAccessibleApps: () => {
        const { activeEmployee, permissions, apps } = get();
        if (!activeEmployee) return [];
        return apps.filter((app) => app.status === "ACTIVE" && permissions.includes(app.required_permission));
      },

      getSession: () => {
        const { sessionExpiry } = get();
        if (!sessionExpiry) return { expiresAt: null, isValid: false };
        return { expiresAt: sessionExpiry, isValid: Date.now() < sessionExpiry };
      },

      hasPermission: (key) => get().permissions.includes(key),

      getEmployeeById: (id) => {
        return get().employees.find((e) => e.employee_id === id);
      },

      findEmployeeByUsername: (username) => {
        const wanted = username.trim().toLowerCase();
        return get().employees.find((e) => e.username.trim().toLowerCase() === wanted);
      },

      getAuditLog: () => {
        return get().auditLog;
      },

      updateRole: (roleId, permissions) => {
        const state = get();
        const updatedRoles = state.roles.map((r) => r.role_id === roleId ? { ...r, permissions } : r);
        set({ roles: updatedRoles, auditLog: addLog(state, "ROLE_UPDATE", state.employeeId, `Updated role ${roleId} permissions`) });
      },

      updateEmployeeRole: (employeeId, role) => {
        const state = get();
        const updatedEmployees = state.employees.map((e) => e.employee_id === employeeId ? { ...e, role } : e);
        set({ employees: updatedEmployees, auditLog: addLog(state, "EMPLOYEE_ROLE_UPDATE", employeeId, `Changed ${employeeId} role to ${role}`) });
      },

      createEmployee: (employee) => {
        const state = get();
        const id = employee.employee_id?.trim() || genId("emp");
        if (state.employees.some((e) => e.employee_id === id)) {
          return { success: false, message: "Employee ID already exists" };
        }
        const username = employee.username.trim().toLowerCase();
        if (!username) {
          return { success: false, message: "Username is required" };
        }
        if (state.employees.some((e) => e.username.trim().toLowerCase() === username)) {
          return { success: false, message: "Username already exists" };
        }
        const newEmployee: Employee = {
          employee_id: id,
          username,
          name: employee.name,
          role: employee.role,
          status: employee.status || "ACTIVE",
          base_branch: employee.base_branch,
        };
        set({ employees: [...state.employees, newEmployee], auditLog: addLog(state, "USER_CREATED", state.employeeId, `Created employee ${id}`) });
        return { success: true, message: "Employee created" };
      },

      updateEmployee: (employeeId, updates) => {
        const state = get();
        const exists = state.employees.some((e) => e.employee_id === employeeId);
        if (!exists) return { success: false, message: "Employee not found" };
        const updatedEmployees = state.employees.map((e) => e.employee_id === employeeId ? { ...e, ...updates } : e);
        set({ employees: updatedEmployees, auditLog: addLog(state, "USER_UPDATED", state.employeeId, `Updated employee ${employeeId}`) });
        return { success: true, message: "Employee updated" };
      },

      toggleEmployeeStatus: (employeeId) => {
        const state = get();
        const updatedEmployees = state.employees.map((e) => {
          if (e.employee_id !== employeeId) return e;
          const next = e.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
          return { ...e, status: next };
        });
        const target = updatedEmployees.find((e) => e.employee_id === employeeId);
        set({ employees: updatedEmployees, auditLog: addLog(state, target?.status === "ACTIVE" ? "USER_ACTIVATED" : "USER_DEACTIVATED", employeeId, `Toggled status for ${employeeId}`) });
      },

      resetEmployeePin: (employeeId) => {
        const state = get();
        if (!state.employees.some((e) => e.employee_id === employeeId)) {
          return { success: false, message: "Employee not found" };
        }
        set({ auditLog: addLog(state, "PIN_RESET", employeeId, `PIN reset requested for ${employeeId}`) });
        return { success: true, message: "PIN reset requested (Sheets admin)" };
      },

      createRole: (role) => {
        const state = get();
        const id = role.role_id?.trim() || genId("role");
        if (state.roles.some((r) => r.role_id === id)) {
          return { success: false, message: "Role ID already exists" };
        }
        const newRole: Role = { role_id: id, name: role.name, permissions: role.permissions || [] };
        set({ roles: [...state.roles, newRole], auditLog: addLog(state, "ROLE_CREATED", state.employeeId, `Created role ${id}`) });
        return { success: true, message: "Role created" };
      },

      deleteRole: (roleId) => {
        const state = get();
        set({ roles: state.roles.filter((r) => r.role_id !== roleId), auditLog: addLog(state, "ROLE_DELETED", state.employeeId, `Deleted role ${roleId}`) });
      },

      createPermission: (permission) => {
        const state = get();
        const key = permission.key.trim();
        if (state.permissionsCatalog.some((p) => p.key === key)) {
          return { success: false, message: "Permission key already exists" };
        }
        const id = permission.permission_id?.trim() || genId("perm");
        const newPermission: Permission = { permission_id: id, key, description: permission.description };
        set({ permissionsCatalog: [...state.permissionsCatalog, newPermission], auditLog: addLog(state, "PERMISSION_CREATED", state.employeeId, `Created permission ${key}`) });
        return { success: true, message: "Permission created" };
      },

      deletePermission: (permissionKey) => {
        const state = get();
        const cleanedRoles = state.roles.map((r) => ({ ...r, permissions: r.permissions.filter((p) => p !== permissionKey) }));
        set({
          permissionsCatalog: state.permissionsCatalog.filter((p) => p.key !== permissionKey),
          roles: cleanedRoles,
          auditLog: addLog(state, "PERMISSION_DELETED", state.employeeId, `Deleted permission ${permissionKey}`),
        });
      },

      createApp: (app) => {
        const state = get();
        const id = app.app_id?.trim().toUpperCase() || genId("app").toUpperCase();
        if (state.apps.some((a) => a.app_id === id)) {
          return { success: false, message: "App ID already exists" };
        }
        const newApp: App = {
          app_id: id,
          name: app.name,
          url: app.url,
          icon: app.icon || "layout-grid",
          status: app.status || "ACTIVE",
          required_permission: app.required_permission,
        };
        set({ apps: [...state.apps, newApp], auditLog: addLog(state, "APP_CREATED", state.employeeId, `Created app ${id}`) });
        return { success: true, message: "App created" };
      },

      updateApp: (appId, updates) => {
        const state = get();
        const exists = state.apps.some((a) => a.app_id === appId);
        if (!exists) return { success: false, message: "App not found" };
        const updatedApps = state.apps.map((a) => a.app_id === appId ? { ...a, ...updates } : a);
        set({ apps: updatedApps, auditLog: addLog(state, "APP_UPDATED", state.employeeId, `Updated app ${appId}`) });
        return { success: true, message: "App updated" };
      },

      deleteApp: (appId) => {
        const state = get();
        set({ apps: state.apps.filter((a) => a.app_id !== appId), auditLog: addLog(state, "APP_DELETED", state.employeeId, `Deleted app ${appId}`) });
      },

      getCurrentDate: () => {
        return today();
      },

      getWorkContext: () => {
        const { activeEmployee, branches, shifts, schedules } = get();
        if (!activeEmployee) {
          return { employee_id: "", date: today(), branch: null, shift: null, schedule: null };
        }
        const date = today();
        const schedule = schedules.find((s) => s.employee_id === activeEmployee.employee_id && s.date === date) || null;
        const branch = schedule ? branches.find((b) => b.branch_id === schedule.branch_id) || null : null;
        const shift = schedule ? shifts.find((s) => s.shift_id === schedule.shift_id) || null : null;
        return { employee_id: activeEmployee.employee_id, date, branch, shift, schedule };
      },
    }),
    { name: "mochikin-domain-storage" }
  )
);
