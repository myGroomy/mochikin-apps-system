import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { getRegistryApps } from "@/lib/server/registry";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  try {
    const apps = (await getRegistryApps()).filter(
      (app) => app.status === "ACTIVE" && session.permissions.includes(app.required_permission)
    );
    return NextResponse.json({ apps });
  } catch (error) {
    console.error("Registry lookup failed", error);
    return NextResponse.json({ message: "Application registry unavailable" }, { status: 503 });
  }
}
