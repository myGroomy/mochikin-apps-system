import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";

export async function requireAdmin(): Promise<
  | { session: NonNullable<Awaited<ReturnType<typeof getSession>>>; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (session.roleId !== "role_admin") {
    return { session: null, error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
