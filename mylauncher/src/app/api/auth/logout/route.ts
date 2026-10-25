import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/server/session";

export async function POST() {
  try {
    const session = await getSession();
    if (session?.sessionId) {
      const { revokeSessionById } = await import("@/lib/server/data");
      await revokeSessionById(session.sessionId);
    }
  } catch (error) {
    console.error("Logout revoke failed", error);
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
