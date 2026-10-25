import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionManagement } from "@/components/admin/PermissionManagement";

export const metadata: Metadata = {
  title: "Permissions — MOCHIKIN LAUNCHER",
};

export default function AdminPermissionsPage() {
  return (
    <AppShell>
      <PermissionManagement />
    </AppShell>
  );
}
