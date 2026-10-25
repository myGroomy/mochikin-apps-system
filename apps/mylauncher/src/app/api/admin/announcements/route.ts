import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/server/data";
import { writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const announcements = await listAnnouncements({ includeArchived: true });
    return NextResponse.json({ success: true, announcements });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await createAnnouncement({ ...body, created_by: session!.employeeId });
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "create_announcement",
        target: result.announcement?.announcement_id,
        details: body.title,
      });
    }
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const { announcement_id: announcementId, ...updates } = body;
    if (!announcementId) {
      return NextResponse.json({ success: false, message: "announcement_id required" }, { status: 400 });
    }
    const result = await updateAnnouncement(announcementId, updates);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "update_announcement",
        target: announcementId,
        details: JSON.stringify(updates),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const announcementId = typeof body === "string" ? body : body.announcement_id;
    const result = await deleteAnnouncement(String(announcementId));
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "delete_announcement",
        target: String(announcementId),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
