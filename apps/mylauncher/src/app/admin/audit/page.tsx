import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuditLogView } from "@/components/admin/AuditLogView";

export const metadata: Metadata = {
  title: "Audit Log — MOCHIKIN LAUNCHER",
};

export default function AdminAuditPage() {
  return (
    <AppShell>
      <AuditLogView />
    </AppShell>
  );
}
