"use client";

import { useAuditLogs } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ScrollText, RefreshCw } from "lucide-react";

export function AuditLogView() {
  const { logs, loading, error, refetch } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Audit Log</h1>
          <p className="text-sm text-ink-soft mt-1">Security and configuration events.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} aria-label="Refresh audit log">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> All Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2" aria-busy="true" aria-live="polite">
              <span className="sr-only">Loading audit log…</span>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-sunken" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-sm text-rose" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && (
            <ScrollArea className="h-[600px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Timestamp</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Action</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Employee</th>
                    <th className="text-left text-xs font-medium text-ink-soft pb-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {logs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-secondary/50">
                      <td className="py-2 text-xs font-mono text-ink-soft">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs font-mono text-ink">{entry.employeeId || "system"}</td>
                      <td className="py-2 text-sm text-ink-soft">{entry.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-sm text-ink-soft">
                        No audit events yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
