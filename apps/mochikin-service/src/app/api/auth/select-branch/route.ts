import { NextRequest, NextResponse } from "next/server";
import { getServicesSession, setServicesSessionCookie } from "@/lib/auth";
import { getUserAccessibleBranches } from "@/lib/branchService";

/**
 * POST /api/auth/select-branch
 * Sets or switches the user's Active Working Branch in Mochikin Service.
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
    } | null;

    const branchId = body?.branchId?.trim();
    if (!branchId) {
      return NextResponse.json(
        { success: false, message: "Pilih cabang aktif terlebih dahulu." },
        { status: 400 }
      );
    }

    const accessible = await getUserAccessibleBranches(
      session.userId,
      session.branchId,
      session.role
    );

    const chosen = accessible.find((b) => b.id === branchId || b.code === branchId);

    if (!chosen) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda tidak memiliki hak akses operasional ke cabang yang dipilih.",
        },
        { status: 403 }
      );
    }

    // Update central session with chosen active working branch
    const updated = await setServicesSessionCookie({
      ...session,
      activeBranchId: chosen.id,
      activeBranchCode: chosen.code,
      activeBranchName: chosen.name,
      branchId: chosen.id,
      branchCode: chosen.code,
      branchName: chosen.name,
      assignedBranches: accessible,
      hasSelectedBranch: true,
    });

    return NextResponse.json({
      success: true,
      message: `Cabang aktif berhasil ditetapkan: ${chosen.name}`,
      activeBranch: {
        id: chosen.id,
        code: chosen.code,
        name: chosen.name,
      },
      hasSelectedBranch: true,
    });
  } catch (err: unknown) {
    console.error("Error in /api/auth/select-branch:", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menyimpan cabang aktif." },
      { status: 500 }
    );
  }
}
