import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { EmployeeManagement } from "@/components/admin/EmployeeManagement";

export const metadata: Metadata = {
  title: "Employees — MOCHIKIN LAUNCHER",
};

export default function AdminEmployeesPage() {
  return (
    <AppShell>
      <EmployeeManagement />
    </AppShell>
  );
}
