import { getAllAppTargetUrls } from "@/lib/apps";
import { AdminAppUrlManager } from "@/components/AdminAppUrlManager";

export const metadata = {
  title: "Manajemen Koneksi App — MyService Admin",
};

export default async function AdminAppsPage() {
  const apps = await getAllAppTargetUrls();
  return <AdminAppUrlManager initialApps={apps} />;
}
