import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { getRegistryApps, createRegistryApp, updateRegistryApp, deleteRegistryApp } from "@/lib/server/registry";
import { writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const apps = await getRegistryApps();
    return NextResponse.json({ success: true, apps });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await createRegistryApp(body);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "create_app",
        target: result.app?.app_id,
        details: body.name,
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
    const { app_id: appId, ...updates } = body;
    if (!appId) return NextResponse.json({ success: false, message: "app_id required" }, { status: 400 });
    const result = await updateRegistryApp(appId, updates);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "update_app",
        target: appId,
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
    const appId = typeof body === "string" ? body : body.app_id;
    const result = await deleteRegistryApp(String(appId));
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "delete_app",
        target: String(appId),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
