import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { listSessions, revokeSessionById, writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const sessions = await listSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const sessionId = body.session_id || body;
    const result = await revokeSessionById(String(sessionId));
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "revoke_session",
        target: String(sessionId),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
