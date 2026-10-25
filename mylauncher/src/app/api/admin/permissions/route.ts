import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { listPermissions, createPermission, deletePermission, writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const permissions = await listPermissions();
    return NextResponse.json({ success: true, permissions });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await createPermission(body);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "create_permission",
        target: result.permission?.key,
        details: body.description,
      });
    }
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const key = typeof body === "string" ? body : body.key;
    const result = await deletePermission(String(key));
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "delete_permission",
        target: String(key),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
