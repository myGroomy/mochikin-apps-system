import { getAllBranches } from "@/lib/branchService";
import { BranchManagement } from "@/components/BranchManagement";

export const metadata = {
  title: "Manajemen Cabang — MyService Admin",
};

export default async function AdminBranchesPage() {
  const branches = await getAllBranches();
  return <BranchManagement initialBranches={branches} />;
}
