import { getAllShifts } from "@/lib/shiftService";
import { getAllBranches } from "@/lib/branchService";
import { ShiftManagement } from "@/components/ShiftManagement";

export const metadata = {
  title: "Manajemen Shift — MyService Admin",
};

export default async function AdminShiftsPage() {
  const [shifts, branches] = await Promise.all([
    getAllShifts(),
    getAllBranches(),
  ]);

  return <ShiftManagement initialShifts={shifts} branches={branches} />;
}
