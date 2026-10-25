import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AppManagement } from "@/components/admin/AppManagement";

export const metadata: Metadata = {
  title: "Applications — MOCHIKIN LAUNCHER",
};

export default function AdminAppsPage() {
  return (
    <AppShell>
      <AppManagement />
    </AppShell>
  );
}
