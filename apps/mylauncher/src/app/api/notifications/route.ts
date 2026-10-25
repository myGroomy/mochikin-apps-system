import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { markNotificationRead, deleteNotification } from "@/lib/server/data";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const notificationId = typeof body === "string" ? body : body.notification_id;
    if (!notificationId) {
      return NextResponse.json({ success: false, message: "notification_id required" }, { status: 400 });
    }

    if (body.action === "delete") {
      const result = await deleteNotification(String(notificationId), session.employeeId);
      return NextResponse.json(result, { status: result.success ? 200 : 404 });
    }

    const result = await markNotificationRead(String(notificationId), session.employeeId);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
