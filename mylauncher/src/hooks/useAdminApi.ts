"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminSessionInfo, Announcement, App, AuditLogEntry, Employee, Permission, Role } from "@/lib/types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  pending: boolean;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const body = (await res.json().catch(() => ({}))) as T & { message?: string; success?: boolean };
    if (!res.ok) return { ok: false, message: body.message || `HTTP ${res.status}` };
    return { ok: true, data: body };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function useAsyncList<T>(url: string): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, pending: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchJson<{ success: boolean; message?: string } & Record<string, unknown>>(url);
      if (cancelled) return;
      if (result.ok && result.data) {
        const payload = result.data as Record<string, unknown>;
        const listKey = Object.keys(payload).find((k) => Array.isArray(payload[k]));
        const list = listKey ? (payload[listKey] as T) : null;
        setState({ data: list, error: null, pending: false });
      } else {
        setState({ data: null, error: result.message || "Failed to load", pending: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}

export type MutationResult = { success: boolean; message: string };

async function mutate(url: string, method: string, body: unknown): Promise<MutationResult> {
  const result = await fetchJson<MutationResult>(url, { method, body: JSON.stringify(body) });
  const message = result.message || (result.data && "message" in result.data ? String((result.data as { message?: string }).message) : "");
  if (result.ok) {
    const msg = (result.data as { message?: string } | undefined)?.message || message || "OK";
    return { success: true, message: msg };
  }
  return { success: false, message: message || "Request failed" };
}

export function useEmployees() {
  const list = useAsyncList<Employee[]>("/api/admin/employees");
  const [reloadKey, setReloadKey] = useState(0);
  void reloadKey;

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
    list.refetch();
  }, [list]);

  const create = useCallback(
    async (input: Record<string, unknown>) => {
      const result = await mutate("/api/admin/employees", "POST", input);
      if (result.success) refresh();
      return result;
    },
    [refresh]
  );

  const update = useCallback(
    async (employeeId: string, updates: Record<string, unknown>) => {
      const result = await mutate("/api/admin/employees", "PATCH", { employee_id: employeeId, ...updates });
      if (result.success) refresh();
      return result;
    },
    [refresh]
  );

  const toggleStatus = useCallback(
    async (employeeId: string) => {
      const result = await mutate("/api/admin/employees", "PATCH", { employee_id: employeeId, action: "toggle_status" });
      if (result.success) refresh();
      return result;
    },
    [refresh]
  );

  const resetPin = useCallback(
    async (employeeId: string, newPin: string) => {
      const result = await mutate("/api/admin/employees", "PATCH", {
        employee_id: employeeId,
        action: "reset_pin",
        new_pin: newPin,
      });
      if (result.success) refresh();
      return result;
    },
    [refresh]
  );

  return {
    employees: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    create,
    update,
    toggleStatus,
    resetPin,
  };
}

export function useRoles() {
  const list = useAsyncList<Role[]>("/api/admin/roles");

  const create = useCallback(async (input: Record<string, unknown>) => {
    const result = await mutate("/api/admin/roles", "POST", input);
    if (result.success) list.refetch();
    return result;
  }, [list]);

  const updatePermissions = useCallback(
    async (roleId: string, permissions: string[]) => {
      const result = await mutate("/api/admin/roles", "PATCH", { role_id: roleId, permissions });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  const remove = useCallback(
    async (roleId: string) => {
      const result = await mutate("/api/admin/roles", "PATCH", { role_id: roleId, action: "delete" });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  return {
    roles: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    create,
    updatePermissions,
    remove,
  };
}

export function usePermissions() {
  const list = useAsyncList<Permission[]>("/api/admin/permissions");

  const create = useCallback(
    async (input: Record<string, unknown>) => {
      const result = await mutate("/api/admin/permissions", "POST", input);
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  const remove = useCallback(
    async (key: string) => {
      const result = await mutate("/api/admin/permissions", "DELETE", { key });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  return {
    permissions: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    create,
    remove,
  };
}

export function useApps() {
  const list = useAsyncList<App[]>("/api/admin/apps");

  const create = useCallback(
    async (input: Record<string, unknown>) => {
      const result = await mutate("/api/admin/apps", "POST", input);
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  const update = useCallback(
    async (appId: string, updates: Record<string, unknown>) => {
      const result = await mutate("/api/admin/apps", "PATCH", { app_id: appId, ...updates });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  const remove = useCallback(
    async (appId: string) => {
      const result = await mutate("/api/admin/apps", "DELETE", { app_id: appId });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  return {
    apps: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    create,
    update,
    remove,
  };
}

export function useAnnouncements() {
  const list = useAsyncList<Announcement[]>("/api/admin/announcements");

  const create = useCallback(async (input: Record<string, unknown>) => {
    const result = await mutate("/api/admin/announcements", "POST", input);
    if (result.success) list.refetch();
    return result;
  }, [list]);

  const update = useCallback(
    async (announcementId: string, updates: Record<string, unknown>) => {
      const result = await mutate("/api/admin/announcements", "PATCH", {
        announcement_id: announcementId,
        ...updates,
      });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  const remove = useCallback(
    async (announcementId: string) => {
      const result = await mutate("/api/admin/announcements", "DELETE", {
        announcement_id: announcementId,
      });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  return {
    announcements: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    create,
    update,
    remove,
  };
}

export function useAdminSessions() {
  const list = useAsyncList<AdminSessionInfo[]>("/api/admin/sessions");

  const revoke = useCallback(
    async (sessionId: string) => {
      const result = await mutate("/api/admin/sessions", "PATCH", { session_id: sessionId });
      if (result.success) list.refetch();
      return result;
    },
    [list]
  );

  return {
    sessions: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    revoke,
  };
}

export function useAuditLogs() {
  const list = useAsyncList<AuditLogEntry[]>("/api/admin/audit");
  return {
    logs: list.data ?? [],
    loading: list.data === null && !list.error,
    error: list.error,
    refetch: list.refetch,
  };
}
