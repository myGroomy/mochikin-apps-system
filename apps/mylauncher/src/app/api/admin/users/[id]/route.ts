import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/userService";
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

const UpdateUserSchema = z.object({
  username: z
    .string()
    .min(2, "Username minimal 2 karakter")
    .max(50, "Username maksimal 50 karakter")
    .optional(),
  name: z.string().min(1, "Nama wajib diisi").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  phone: z.string().nullable().optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN harus 6 digit angka")
    .optional()
    .or(z.literal(""))
    .nullable(),
  role: z
    .enum(["super_admin", "role_admin", "branch_manager", "staff", "guest"])
    .optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  branchId: z.string().uuid("Branch ID tidak valid").optional(),
  branchIds: z.array(z.string().uuid("Branch ID tidak valid")).optional(),
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
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "PATCH /api/admin/users/[id] validation error:",
        parsed.error.format()
      );
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError, errors: parsed.error.issues },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (
      parsed.data.status &&
      parsed.data.status !== "active" &&
      id === session.userId
    ) {
      return NextResponse.json(
        { success: false, message: "Tidak bisa menonaktifkan akun sendiri" },
        { status: 400 }
      );
    }

    await updateUser(id, parsed.data, session.userId);

    return NextResponse.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/users/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui user";
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

    if (id === session.userId) {
      return NextResponse.json(
        { success: false, message: "Tidak bisa menghapus akun sendiri" },
        { status: 400 }
      );
    }

    await deleteUser(id);

    return NextResponse.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/users/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menghapus user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
