import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { isRoleAllowedForApp, type EcosystemAppId } from "@/lib/constants";
import { getAppTargetUrl } from "@/lib/apps";
import { createSsoHandoffToken } from "@mochikin/shared/sso";
import { getMochikinServiceEnv } from "@/lib/env";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.redirect(new URL("/?sso=unauthenticated", request.url));
    }

    const rawAppId = request.nextUrl.searchParams.get("appId");
    if (!rawAppId) {
      return NextResponse.json(
        { success: false, message: "Parameter appId wajib disertakan" },
        { status: 400 }
      );
    }

    const appId = rawAppId.toUpperCase() as EcosystemAppId;

    if (!isRoleAllowedForApp(session.role, appId)) {
      return NextResponse.json(
        {
          success: false,
          message: `Role Anda (${session.role}) tidak memiliki izin mengakses aplikasi ${appId}.`,
        },
        { status: 403 }
      );
    }

    const targetUrl = await getAppTargetUrl(appId);
    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          message: `URL aplikasi ${appId} belum dikonfigurasi di environment Mochikin Services.`,
        },
        { status: 503 }
      );
    }

    const env = getMochikinServiceEnv();
    const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnPath"));

    // Generate signed 60-second handoff token
    const token = createSsoHandoffToken(
      {
        employeeId: session.userId,
        username: session.username,
        employeeName: session.name,
        roleName: session.role,
        baseBranch: session.branchCode,
        personId: session.userId,
        branchId: session.branchId,
        jwtRole: session.role,
        permissions: session.permissions,
      },
      appId,
      env.LAUNCHER_SSO_SHARED_SECRET,
      60 // 60s TTL
    );

    const callbackUrl = new URL("/api/auth/sso/callback", targetUrl);
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set("returnPath", returnPath);

    return NextResponse.redirect(callbackUrl);
  } catch (err: unknown) {
    console.error("SSO handoff error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal memproses SSO handoff" },
      { status: 500 }
    );
  }
}
