import { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";

export const metadata: Metadata = {
  title: "Announcements — MOCHIKIN LAUNCHER",
};

export default function AdminAnnouncementsPage() {
  return (
    <AppShell>
      <AnnouncementManagement />
    </AppShell>
  );
}
