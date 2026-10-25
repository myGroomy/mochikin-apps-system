import { NextRequest, NextResponse } from "next/server";
import { SSO_TARGETS } from "@/lib/constants";
import { getSession } from "@/lib/server/session";
import { createSsoHandoffToken } from "@mochikin/shared/sso";
import { validateEnv } from "@mochikin/shared/env";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
}

export async function GET(request: NextRequest) {
  const env = validateEnv();
  const session = await getSession();
  const appId = request.nextUrl.searchParams.get("appId")?.toUpperCase() as keyof typeof SSO_TARGETS | null;
  const target = appId ? SSO_TARGETS[appId] : undefined;

  if (!session || !appId || !target || !session.permissions.includes(target.permission)) {
    return NextResponse.json({ success: false, message: "Application access denied" }, { status: 403 });
  }

  try {
    const callback = new URL(target.callbackPath, target.url);
    callback.searchParams.set("token", createSsoHandoffToken(session, appId, env.LAUNCHER_SSO_SHARED_SECRET));
    callback.searchParams.set("returnPath", safeReturnPath(request.nextUrl.searchParams.get("returnPath")));
    return NextResponse.redirect(callback);
  } catch (error) {
    console.error("SSO handoff failed", error);
    return NextResponse.json({ success: false, message: "SSO handoff unavailable" }, { status: 503 });
  }
}
