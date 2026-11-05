import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { updateBranch, deleteBranch } from "@/lib/branchService";
import { countUsersByBranch } from "@/lib/userService";
import { z } from "zod";

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

const UpdateBranchSchema = z.object({
  code: z
    .string()
    .min(2, "Kode cabang minimal 2 karakter")
    .max(10, "Kode cabang maksimal 10 karakter")
    .optional(),
  name: z.string().min(1, "Nama cabang wajib diisi").optional(),
  city: z.string().min(1, "Kota wajib diisi").optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(["active", "closed", "inactive"]).optional(),
});

export async function PATCH(
  request: NextRequest,
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

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateBranchSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    await updateBranch(id, parsed.data, session.userId);

    return NextResponse.json({
      success: true,
      message: "Cabang berhasil diperbarui",
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/branches/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui cabang";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if there are active users assigned to this branch
    const userCount = await countUsersByBranch(id);
    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat menghapus cabang yang masih memiliki ${userCount} user aktif. Pindahkan user terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await deleteBranch(id);

    return NextResponse.json({
      success: true,
      message: "Cabang berhasil dihapus",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/branches/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menghapus cabang";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
