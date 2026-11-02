import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import {
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  type ManagedBranch,
} from "@/lib/branchService";
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

export async function GET() {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const branches: ManagedBranch[] = await getAllBranches();
    return NextResponse.json({ success: true, branches });
  } catch (err: unknown) {
    console.error("GET /api/admin/branches error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data cabang" },
      { status: 500 }
    );
  }
}

const CreateBranchSchema = z.object({
  code: z
    .string()
    .min(2, "Kode cabang minimal 2 karakter")
    .max(10, "Kode cabang maksimal 10 karakter"),
  name: z.string().min(1, "Nama cabang wajib diisi"),
  city: z.string().min(1, "Kota wajib diisi"),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
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
    const parsed = CreateBranchSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const result = await createBranch(parsed.data, session.userId);

    return NextResponse.json({
      success: true,
      message: `Cabang ${parsed.data.name} (${parsed.data.code.toUpperCase()}) berhasil ditambahkan`,
      id: result.id,
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/branches error:", err);
    const msg = err instanceof Error ? err.message : "Gagal membuat cabang";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

const UpdateBranchWithIdSchema = z.object({
  id: z.string().uuid("Branch ID tidak valid"),
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
    const parsed = UpdateBranchWithIdSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    await updateBranch(id, updateFields, session.userId);

    return NextResponse.json({
      success: true,
      message: "Cabang berhasil diperbarui",
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/branches error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui cabang";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

const DeleteBranchWithIdSchema = z.object({
  id: z.string().uuid("Branch ID tidak valid"),
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
    const parsed = DeleteBranchWithIdSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

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
    console.error("DELETE /api/admin/branches error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menghapus cabang";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
