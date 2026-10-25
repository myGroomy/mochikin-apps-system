import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SessionManagement } from "@/components/admin/SessionManagement";

export const metadata: Metadata = {
  title: "Sessions — MOCHIKIN LAUNCHER",
};

export default function AdminSessionsPage() {
  return (
    <AppShell>
      <SessionManagement />
    </AppShell>
  );
}
