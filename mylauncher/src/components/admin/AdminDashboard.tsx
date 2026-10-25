"use client";

import { useAdminSessions, useApps, useAuditLogs, useEmployees, usePermissions, useRoles } from "@/hooks/useAdminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, UserCheck, Shield, AppWindow, KeyRound, Users, ScrollText } from "lucide-react";
import Link from "next/link";
import { useFeatureSettings } from "@/components/layout/FeatureSettingsProvider";

export function AdminDashboard() {
  const { employees } = useEmployees();
  const { roles } = useRoles();
  const { permissions } = usePermissions();
  const { apps } = useApps();
  const { sessions } = useAdminSessions();
  const { logs } = useAuditLogs();
  const features = useFeatureSettings();

  const recentLogs = logs.slice(0, 20);
  const activeSessions = sessions.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Dasbor Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/employees">
          <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <Users className="h-4 w-4" /> Karyawan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink">{employees.length}</p>
              <p className="text-xs text-ink-soft mt-1">Kelola pengguna, peran, PIN</p>
            </CardContent>
          </Card>
        </Link>
         {features.admin_roles && <Link href="/admin/roles">
          <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <Shield className="h-4 w-4" /> Peran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink">{roles.length}</p>
              <p className="text-xs text-ink-soft mt-1">Penugasan izin</p>
            </CardContent>
          </Card>
         </Link>}
         {features.admin_permissions && <Link href="/admin/permissions">
          <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Izin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink">{permissions.length}</p>
              <p className="text-xs text-ink-soft mt-1">Kunci akses</p>
            </CardContent>
          </Card>
         </Link>}
         {features.admin_apps && <Link href="/admin/apps">
          <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <AppWindow className="h-4 w-4" /> Aplikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink">{apps.length}</p>
              <p className="text-xs text-ink-soft mt-1">Pengelolaan registry</p>
            </CardContent>
          </Card>
         </Link>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Karyawan Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-ink">{employees.filter((e) => e.status === "ACTIVE").length}</p>
            <p className="text-xs text-ink-soft mt-1">Dapat mengakses peluncur</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
              <Shield className="h-4 w-4" /> Sesi Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-ink">{activeSessions}</p>
            <p className="text-xs text-ink-soft mt-1">Masuk langsung</p>
          </CardContent>
        </Card>
        <Link href="/admin/audit">
          <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <Clock className="h-4 w-4" /> Event Audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ink">{logs.length}</p>
              <p className="text-xs text-ink-soft mt-1">Total event yang dicatat</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Aktivitas Terkini
            <Link href="/admin/audit" className="ml-auto text-xs font-normal text-mist hover:text-ink">Lihat semua</Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-ink-soft">Belum ada event audit</p>
            ) : (
              <ul className="space-y-2">
                {recentLogs.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 text-sm">
                    <span className="text-ink-soft font-mono text-xs">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "—"}
                    </span>
                    <span className="text-ink">{entry.action}</span>
                    <span className="text-mist">{entry.employeeId || "system"}</span>
                    <span className="text-ink-soft text-xs">{entry.details}</span>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
