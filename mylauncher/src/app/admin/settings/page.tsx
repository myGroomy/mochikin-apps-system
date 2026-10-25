import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { FeatureSettings } from "@/components/admin/FeatureSettings";

export const metadata: Metadata = {
  title: "Settings — MOCHIKIN LAUNCHER",
};

export default function AdminSettingsPage() {
  return (
    <AppShell>
      <FeatureSettings />
    </AppShell>
  );
}
