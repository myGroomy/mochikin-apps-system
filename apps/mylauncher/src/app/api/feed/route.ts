import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import {
  listActiveAnnouncementsForRole,
  listNotificationsForEmployee,
  readAuditLogsForEmployee,
} from "@/lib/server/data";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const [announcements, notifications, activity] = await Promise.all([
      listActiveAnnouncementsForRole(session.roleId).catch(() => []),
      listNotificationsForEmployee(session.employeeId).catch(() => []),
      readAuditLogsForEmployee(session.employeeId, 20).catch(() => []),
    ]);
    return NextResponse.json({ success: true, feed: { announcements, notifications, activity } });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 503 });
  }
}
