import { redirect } from "next/navigation";
import { getServicesSession } from "@/lib/auth";
import { getAllAppTargetUrls } from "@/lib/apps";
import { getAllUsers } from "@/lib/userService";
import { getAllBranches } from "@/lib/branchService";
import { AdminHealthContent } from "@/components/AdminHealthContent";

export default async function AdminHealthPage() {
  const session = await getServicesSession();

  if (!session) {
    redirect("/?sso=unauthenticated");
  }

  const [apps, users, branches] = await Promise.all([
    getAllAppTargetUrls(),
    getAllUsers(),
    getAllBranches(),
  ]);

  return (
    <AdminHealthContent
      session={session}
      apps={apps}
      initialUsers={users}
      initialBranches={branches}
    />
  );
}
