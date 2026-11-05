import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  type ManagedUser,
} from "@/lib/userService";
import { getAllBranches } from "@/lib/branchService";
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

export async function GET() {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const [users, branches] = await Promise.all([getAllUsers(), getAllBranches()]);

    const response: { users: ManagedUser[]; branches: typeof branches } = {
      users,
      branches,
    };

    return NextResponse.json({ success: true, ...response });
  } catch (err: unknown) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data user" },
      { status: 500 }
    );
  }
}

const CreateUserSchema = z.object({
  username: z
    .string()
    .min(2, "Username minimal 2 karakter")
    .max(50, "Username maksimal 50 karakter"),
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().nullable().optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN harus 6 digit angka"),
  role: z.enum([
    "super_admin",
    "role_admin",
    "branch_manager",
    "staff",
    "guest",
  ]),
  branchId: z.string().uuid("Branch ID tidak valid").optional(),
  branchIds: z.array(z.string().uuid("Branch ID tidak valid")).min(1, "Pilih minimal 1 cabang penugasan").optional(),
}).refine((data) => data.branchId || (data.branchIds && data.branchIds.length > 0), {
  message: "Cabang penugasan wajib dipilih",
  path: ["branchIds"],
});

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const primaryBranchId = (parsed.data.branchIds && parsed.data.branchIds.length > 0)
      ? parsed.data.branchIds[0]
      : parsed.data.branchId!;

    const result = await createUser(
      {
        ...parsed.data,
        branchId: primaryBranchId,
        branchIds: parsed.data.branchIds || [primaryBranchId],
      },
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: `User ${parsed.data.username} berhasil ditambahkan`,
      id: result.id,
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/users error:", err);
    const msg = err instanceof Error ? err.message : "Gagal membuat user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

const UpdateUserWithIdSchema = z.object({
  id: z.string().uuid("User ID tidak valid"),
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
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateUserWithIdSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "PATCH /api/admin/users validation error:",
        parsed.error.format()
      );
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError, errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    // Prevent self-deactivation
    if (
      updateFields.status &&
      updateFields.status !== "active" &&
      id === session.userId
    ) {
      return NextResponse.json(
        { success: false, message: "Tidak bisa menonaktifkan akun sendiri" },
        { status: 400 }
      );
    }

    await updateUser(id, updateFields, session.userId);

    return NextResponse.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/users error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

const DeleteUserWithIdSchema = z.object({
  id: z.string().uuid("User ID tidak valid"),
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = DeleteUserWithIdSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

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
    console.error("DELETE /api/admin/users error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menghapus user";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
