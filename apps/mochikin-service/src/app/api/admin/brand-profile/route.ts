import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { getBrandProfile, updateBrandProfile } from "@/lib/brandProfileService";

function isAuthorizedAdmin(session: any): boolean {
  if (!session) return false;
  const role = String(session.role || "").toLowerCase();
  return role === "super_admin" || role === "role_admin" || role === "admin";
}

export async function GET() {
  const session = await getServicesSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const brandProfile = await getBrandProfile();
  return NextResponse.json({ success: true, brandProfile });
}

export async function PATCH(req: NextRequest) {
  const session = await getServicesSession();
  if (!isAuthorizedAdmin(session)) {
    return NextResponse.json({ success: false, error: "Akses ditolak: Hanya administrator yang dapat mengubah profil brand." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = await updateBrandProfile(
      {
        brandName: body.brandName,
        tagline: body.tagline,
        logoUrl: body.logoUrl,
        themes: body.themes,
      },
      session?.username || session?.email || "admin"
    );

    const res = NextResponse.json({ success: true, brandProfile: updated });

    // Propagate brand name and themes cookie across the domain/localhost
    res.cookies.set("mochikin_brand_name", encodeURIComponent(updated.brandName), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    res.cookies.set("mochikin_brand_themes", encodeURIComponent(JSON.stringify(updated.themes)), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui profil brand";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
