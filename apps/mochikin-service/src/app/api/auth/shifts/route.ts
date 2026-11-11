import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { getActiveShifts, type ManagedShift } from "@/lib/shiftService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak ditemukan" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || session.activeBranchId || session.branchId || null;

    const shifts: ManagedShift[] = await getActiveShifts(branchId);
    return NextResponse.json({ success: true, shifts });
  } catch (err) {
    console.error("GET /api/auth/shifts error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar shift" },
      { status: 500 }
    );
  }
}
