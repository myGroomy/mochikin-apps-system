import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DocsView } from "@/components/docs/DocsView";

export const metadata: Metadata = {
  title: "Documentation — MOCHIKIN LAUNCHER",
};

export default function DocsPage() {
  return (
    <AppShell>
      <DocsView />
    </AppShell>
  );
}
