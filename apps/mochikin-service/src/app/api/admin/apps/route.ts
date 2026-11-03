import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { getAllAppTargetUrls, updateAppTargetUrl } from "@/lib/apps";
import { z } from "zod";

const UpdateAppUrlSchema = z.object({
  appId: z.enum(["STOKIS", "MYCHECK", "MYCUSTOMER", "MYPERFORMANCE"]),
  url: z.string().trim().url("Format URL tidak valid. Contoh: http://localhost:3002 atau https://app.mochikin.com"),
});

export async function GET() {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const isAdmin = session.role === "super_admin" || session.role === "role_admin" || session.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const apps = await getAllAppTargetUrls();
    return NextResponse.json({ success: true, apps });
  } catch (err: unknown) {
    console.error("GET /api/admin/apps error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil daftar URL aplikasi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const isAdmin = session.role === "super_admin" || session.role === "role_admin" || session.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Akses khusus administrator" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateAppUrlSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const { appId, url } = parsed.data;
    const result = await updateAppTargetUrl(appId, url, session.username);

    return NextResponse.json({
      success: true,
      message: `Tautan URL aplikasi ${appId} berhasil diperbarui.`,
      url: result.url,
      appId,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/apps error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui URL aplikasi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
