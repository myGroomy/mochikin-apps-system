import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { getStaffAssignedToBranch } from "@/lib/branchService";

function checkAdmin() {
  return getServicesSession().then((session) => {
    if (!session) return null;
    const isAdmin =
      session.role === "super_admin" ||
      session.role === "role_admin" ||
      session.role === "admin";
    return isAdmin ? session : null;
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const staff = await getStaffAssignedToBranch(id);

    return NextResponse.json({
      success: true,
      branchId: id,
      staffCount: staff.length,
      staff,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/branches/[id]/staff error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar staf cabang" },
      { status: 500 }
    );
  }
}
