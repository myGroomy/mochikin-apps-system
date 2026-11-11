import { NextRequest, NextResponse } from "next/server";
import { getServicesSession, setServicesSessionCookie } from "@/lib/auth";
import { getUserAccessibleBranches } from "@/lib/branchService";
import { OPERATIONAL_SHIFTS, getRecommendedShift } from "@/lib/constants";

/**
 * POST /api/auth/select-branch
 * Sets or switches the user's Active Working Branch & Operational Shift in Mochikin Service.
 * Synchronizes across the ecosystem via central session cookie and SSO handoffs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Sesi kerja tidak ditemukan. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      branchId?: string;
      shiftId?: string;
    } | null;

    const branchId = body?.branchId?.trim();
    const shiftId = body?.shiftId?.trim();

    if (!branchId && !shiftId) {
      return NextResponse.json(
        { success: false, message: "Pilih cabang atau shift aktif terlebih dahulu." },
        { status: 400 }
      );
    }

    const accessible = await getUserAccessibleBranches(
      session.userId,
      session.branchId,
      session.role
    );

    // Resolve branch if provided
    let chosenBranch = accessible.find(
      (b) => b.id === (branchId || session.activeBranchId || session.branchId) ||
             b.code === (branchId || session.activeBranchCode || session.branchCode)
    );

    if (!chosenBranch && accessible.length > 0) {
      chosenBranch = accessible[0];
    }

    if (branchId && !chosenBranch) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki hak akses operasional ke cabang yang dipilih.",
        },
        { status: 403 }
      );
    }

    // Resolve shift if provided or keep current/recommended
    let chosenShift = OPERATIONAL_SHIFTS.find((s) => s.id === shiftId || s.type === shiftId);
    if (!chosenShift) {
      chosenShift = OPERATIONAL_SHIFTS.find((s) => s.id === session.activeShiftId) || getRecommendedShift();
    }

    // Update central session with chosen active working branch & shift
    const updated = await setServicesSessionCookie({
      ...session,
      ...(chosenBranch && {
        activeBranchId: chosenBranch.id,
        activeBranchCode: chosenBranch.code,
        activeBranchName: chosenBranch.name,
        branchId: chosenBranch.id,
        branchCode: chosenBranch.code,
        branchName: chosenBranch.name,
        hasSelectedBranch: true,
      }),
      activeShiftId: chosenShift.id,
      activeShiftName: chosenShift.name,
      activeShiftType: chosenShift.type,
      hasSelectedShift: true,
      assignedBranches: accessible,
    });

    return NextResponse.json({
      success: true,
      message: `Sesi kerja berhasil ditetapkan: ${chosenBranch?.name || session.branchName} (${chosenShift.name})`,
      activeBranch: chosenBranch ? {
        id: chosenBranch.id,
        code: chosenBranch.code,
        name: chosenBranch.name,
      } : {
        id: session.activeBranchId || session.branchId,
        code: session.activeBranchCode || session.branchCode,
        name: session.activeBranchName || session.branchName,
      },
      activeShift: {
        id: chosenShift.id,
        name: chosenShift.name,
        type: chosenShift.type,
      },
      hasSelectedBranch: updated.hasSelectedBranch,
      hasSelectedShift: updated.hasSelectedShift,
    });
  } catch (err: unknown) {
    console.error("Error in /api/auth/select-branch:", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menyimpan sesi kerja aktif." },
      { status: 500 }
    );
  }
}
