import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RoleAdministration } from "@/components/admin/RoleAdministration";

export const metadata: Metadata = {
  title: "Roles — MOCHIKIN LAUNCHER",
};

export default function AdminRolesPage() {
  return (
    <AppShell>
      <RoleAdministration />
    </AppShell>
  );
}
