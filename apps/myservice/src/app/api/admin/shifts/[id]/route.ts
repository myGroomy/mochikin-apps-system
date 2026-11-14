import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import {
  updateShift,
  deleteShift,
  getShiftById,
} from "@/lib/shiftService";
import { z } from "zod";

async function checkAdmin() {
  const session = await getServicesSession();
  if (!session) return null;
  const isAdmin =
    session.role === "super_admin" ||
    session.role === "role_admin" ||
    session.role === "admin";
  return isAdmin ? session : null;
}

const UpdateShiftSchema = z.object({
  name: z.string().min(2, "Nama shift minimal 2 karakter").optional(),
  shortName: z.string().optional(),
  type: z.enum(["opening", "closing", "regular", "custom"]).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(0).max(23).optional(),
  branchId: z.string().nullable().optional(),
  tagline: z.string().optional(),
  isActive: z.boolean().optional(),
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
    const parsed = UpdateShiftSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const updated = await updateShift(id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Shift tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Shift '${updated.name}' berhasil diperbarui`,
      shift: updated,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/shifts/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data shift" },
      { status: 500 }
    );
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
    const existing = await getShiftById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Shift tidak ditemukan" },
        { status: 404 }
      );
    }

    const result = await deleteShift(id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message || "Gagal menghapus shift" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Shift '${existing.name}' berhasil dihapus`,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/shifts/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus shift" },
      { status: 500 }
    );
  }
}
