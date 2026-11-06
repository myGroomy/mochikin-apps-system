import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import {
  getAllAppTargetUrls,
  updateAppRegistry,
  updateAppTargetUrl,
  validateUrl,
} from "@/lib/apps";
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

const UpdateAppSchema = z.object({
  appId: z.string().min(1, "Identifier aplikasi wajib diisi"),
  url: z
    .string()
    .trim()
    .url("Format URL tidak valid. Contoh: http://localhost:3002 atau https://app.mochikin.com")
    .refine((value) => /^https?:\/\//i.test(value), "URL harus menggunakan http:// atau https:// lengkap")
    .optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
  callbackUrl: z
    .string()
    .trim()
    .url("Format Callback URL tidak valid")
    .refine((value) => /^https?:\/\//i.test(value), "Callback URL harus menggunakan http:// atau https:// lengkap")
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
  allowedRoles: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
    }

    const apps = await getAllAppTargetUrls();
    return NextResponse.json({ success: true, apps });
  } catch (err: unknown) {
    console.error("GET /api/admin/apps error:", err);
    return NextResponse.json({ success: false, message: "Gagal mengambil daftar aplikasi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ success: false, message: "Akses khusus administrator" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateAppSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const { appId, url, title, description, callbackUrl, status, allowedRoles } = parsed.data;

    // Validate security: Ensure callbackUrl has http or https protocol and doesn't allow arbitrary pseudo-schemes
    if (callbackUrl) {
      validateUrl(callbackUrl, "Callback URL / Redirect URI");
    }

    if (url) {
      validateUrl(url, "URL Target");
    }

    await updateAppRegistry(
      appId,
      {
        title,
        description,
        url,
        callbackUrl,
        status,
        allowedRoles,
      },
      session.username
    );

    return NextResponse.json({
      success: true,
      message: `Konfigurasi aplikasi ${title || appId} berhasil diperbarui.`,
      appId,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/apps error:", err);
    const msg = err instanceof Error ? err.message : "Gagal memperbarui konfigurasi aplikasi";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ success: false, message: "Akses khusus administrator" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = UpdateAppSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Payload tidak valid";
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const { appId, url, title, description, callbackUrl, status, allowedRoles } = parsed.data;

    if (!url) {
      return NextResponse.json({ success: false, message: "URL aplikasi wajib diisi" }, { status: 400 });
    }

    validateUrl(url, "URL Aplikasi");
    if (callbackUrl) {
      validateUrl(callbackUrl, "Callback URL / Redirect URI");
    }

    await updateAppRegistry(
      appId,
      {
        title: title || appId,
        description,
        url,
        callbackUrl: callbackUrl || `${url.replace(/\/+$/, "")}/api/auth/sso/callback`,
        status: status || "active",
        allowedRoles,
      },
      session.username
    );

    return NextResponse.json({
      success: true,
      message: `Aplikasi ${title || appId} berhasil didaftarkan ke ekosistem.`,
      appId,
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/apps error:", err);
    const msg = err instanceof Error ? err.message : "Gagal mendaftarkan aplikasi baru";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
