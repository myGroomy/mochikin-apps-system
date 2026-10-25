import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { listRoles, createRole, updateRole, deleteRole, writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const roles = await listRoles();
    return NextResponse.json({ success: true, roles });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await createRole(body);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "create_role",
        target: result.role?.role_id,
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
    const { role_id: roleId, action, permissions } = body;
    if (!roleId) return NextResponse.json({ success: false, message: "role_id required" }, { status: 400 });
    let result;
    if (action === "delete") {
      result = await deleteRole(roleId);
    } else {
      result = await updateRole(roleId, permissions || []);
    }
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: action === "delete" ? "delete_role" : "update_role",
        target: roleId,
        details: action === "delete" ? "" : JSON.stringify(permissions),
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
    const roleId = body.role_id || body;
    const result = await deleteRole(String(roleId));
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "delete_role",
        target: String(roleId),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
