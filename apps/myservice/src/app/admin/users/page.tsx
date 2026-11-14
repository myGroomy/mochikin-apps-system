import { getServicesSession } from "@/lib/auth";
import { getAllUsers } from "@/lib/userService";
import { getAllBranches } from "@/lib/branchService";
import { UserManagement } from "@/components/UserManagement";

export const metadata = {
  title: "Manajemen User — MyService Admin",
};

export default async function AdminUsersPage() {
  const session = await getServicesSession();
  const [users, branches] = await Promise.all([
    getAllUsers(),
    getAllBranches(),
  ]);

  return (
    <UserManagement
      initialUsers={users}
      branches={branches}
      currentUserId={session?.userId}
    />
  );
}
