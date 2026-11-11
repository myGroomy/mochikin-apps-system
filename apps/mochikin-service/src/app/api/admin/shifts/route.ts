import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import {
  getAllShifts,
  createShift,
  type ManagedShift,
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

export async function GET() {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Akses khusus administrator" },
        { status: 403 }
      );
    }

    const shifts: ManagedShift[] = await getAllShifts();
    return NextResponse.json({ success: true, shifts });
  } catch (err: unknown) {
    console.error("GET /api/admin/shifts error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data shift operasional" },
      { status: 500 }
    );
  }
}

const CreateShiftSchema = z.object({
  name: z.string().min(2, "Nama shift minimal 2 karakter"),
  shortName: z.string().optional(),
  type: z.enum(["opening", "closing", "regular", "custom"]).default("regular"),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  branchId: z.string().nullable().optional(),
  tagline: z.string().optional(),
  isActive: z.boolean().default(true),
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
    const parsed = CreateShiftSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const newShift = await createShift(parsed.data);

    return NextResponse.json(
      {
        success: true,
        message: `Shift '${newShift.name}' berhasil dibuat`,
        shift: newShift,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/shifts error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal membuat shift baru" },
      { status: 500 }
    );
  }
}
