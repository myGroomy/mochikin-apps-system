"use client";

import { useState } from "react";
import { useDomainStore } from "@/stores/useLauncherStore";
import { useAdminSessions } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Shield, LogOut, Ban } from "lucide-react";
import { toast } from "sonner";

export function SessionManagement() {
  const isAuthenticated = useDomainStore((s) => s.isAuthenticated);
  const sessionExpiry = useDomainStore((s) => s.sessionExpiry);
  const employeeId = useDomainStore((s) => s.employeeId);
  const roleName = useDomainStore((s) => s.roleName);
  const revokeSession = useDomainStore((s) => s.revokeSession);
  const getSession = useDomainStore((s) => s.getSession);
  const { sessions, loading, error, revoke } = useAdminSessions();
  const [confirm, setConfirm] = useState<"self" | string | null>(null);
  const [busy, setBusy] = useState(false);

  const session = getSession();

  function handleRevokeSelf() {
    revokeSession();
    toast.info("Session revoked");
    setConfirm(null);
  }

  async function handleRevoke() {
    if (!confirm || confirm === "self") return;
    setBusy(true);
    try {
      const result = await revoke(confirm);
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Session Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Shield className="h-4 w-4" /> Current Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-mist">Status:</span>
            <Badge variant={isAuthenticated ? "default" : "destructive"} className="text-xs">
              {isAuthenticated ? "Active" : "Inactive"}
            </Badge>
          </div>
          {employeeId && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-mist">Employee:</span>
              <span className="text-ink font-mono text-xs">{employeeId}</span>
            </div>
          )}
          {roleName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-mist">Role:</span>
              <span className="text-ink text-xs">{roleName}</span>
            </div>
          )}
          {sessionExpiry && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-mist">Expires:</span>
              <span className="text-ink text-xs">{new Date(sessionExpiry).toLocaleString()}</span>
            </div>
          )}
          {session.isValid && (
            <Button variant="outline" size="sm" className="text-rose" onClick={() => setConfirm("self")}>
              <LogOut className="h-4 w-4 mr-2" /> Revoke My Session
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <Ban className="h-4 w-4" /> All Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-ink-soft">Loading sessions…</p>}
          {error && <p className="text-sm text-rose">{error}</p>}
          {!loading && !error && (
            <ScrollArea className="h-80">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Session</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Employee</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Role</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Expires</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Status</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {sessions.map((s) => (
                    <tr key={s.session_id} className="hover:bg-secondary/50">
                      <td className="py-2 text-xs font-mono text-ink">{s.session_id.slice(0, 8)}…</td>
                      <td className="py-2 text-xs font-mono text-ink">{s.employee_id}</td>
                      <td className="py-2"><Badge variant="secondary" className="text-xs">{s.role_id}</Badge></td>
                      <td className="py-2 text-xs text-ink-soft">{s.expires_at ? new Date(s.expires_at).toLocaleString() : "—"}</td>
                      <td className="py-2">
                        <Badge variant={s.active ? "default" : "destructive"} className="text-xs">
                          {s.revoked_at ? "Revoked" : s.active ? "Active" : "Expired"}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {s.active && (
                          <Button variant="ghost" size="sm" className="text-ash hover:text-rose" onClick={() => setConfirm(s.session_id)}>
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-sm text-ink-soft">No sessions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink">Session Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-soft">
            Session duration is configured to 1 hour. Revoking a session immediately invalidates it across all tabs.
            Audit events are written to the AuditLogs sheet on every admin mutation.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "self" ? "Revoke my session?" : "Revoke session?"}
        description={
          confirm === "self"
            ? "You will be signed out immediately."
            : "The active session will be invalidated across all tabs."
        }
        confirmLabel="Revoke"
        busy={busy}
        onConfirm={() => {
          if (confirm === "self") handleRevokeSelf();
          else void handleRevoke();
        }}
      />
    </div>
  );
}
