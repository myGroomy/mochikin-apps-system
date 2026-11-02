'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getRoleCapabilities,
  normalizeRole,
  type RoleCapabilities,
  type UserRole,
} from '@/lib/roles';

export type SessionStatus = 'loading' | 'ready' | 'error';

export interface SessionSnapshot {
  authenticated: boolean;
  personId: string | null;
  branchId: string | null;
  name: string | null;
  branchName: string | null;
  role: UserRole;
}

interface SessionContextValue extends SessionSnapshot {
  status: SessionStatus;
  capabilities: RoleCapabilities;
  refresh: () => Promise<void>;
}

const ANONYMOUS: SessionSnapshot = {
  authenticated: false,
  personId: null,
  branchId: null,
  name: null,
  branchName: null,
  role: 'role_staff',
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(ANONYMOUS);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Session request failed (${res.status})`);

      const data = await res.json();
      setSnapshot({
        authenticated: Boolean(data.authenticated),
        personId: data.personId ?? null,
        branchId: data.branchId ?? null,
        name: data.name ?? null,
        branchName: data.branchName ?? null,
        role: normalizeRole(data.role),
      });
      setStatus('ready');
    } catch {
      setSnapshot(ANONYMOUS);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...snapshot,
      status,
      capabilities: getRoleCapabilities(snapshot.role),
      refresh,
    }),
    [snapshot, status, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return context;
}
