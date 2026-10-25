import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { readAuditLogs } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const logs = await readAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
