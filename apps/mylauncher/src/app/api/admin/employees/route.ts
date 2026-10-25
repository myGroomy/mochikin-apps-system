import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { listEmployees, createEmployee, updateEmployee, toggleEmployeeStatus, resetEmployeePin, writeAuditLog } from "@/lib/server/data";

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  void session;
  try {
    const employees = await listEmployees();
    return NextResponse.json({ success: true, employees });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await createEmployee(body);
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: "create_employee",
        target: result.employee?.employee_id,
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
    const { employee_id: employeeId, action, ...updates } = body;
    if (!employeeId) return NextResponse.json({ success: false, message: "employee_id required" }, { status: 400 });
    let result;
    if (action === "toggle_status") {
      result = await toggleEmployeeStatus(employeeId);
    } else if (action === "reset_pin") {
      result = await resetEmployeePin(employeeId, body.new_pin);
    } else {
      result = await updateEmployee(employeeId, updates);
    }
    if (result.success) {
      await writeAuditLog({
        actor_employee_id: session!.employeeId,
        action: action || "update_employee",
        target: employeeId,
        details: JSON.stringify(updates),
      });
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
