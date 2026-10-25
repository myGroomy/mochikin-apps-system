import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { findEmployee, getRole } from "@/lib/server/data";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const employee = await findEmployee(session.employeeId);
    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const role = await getRole(session.roleId);
    return NextResponse.json({
      session: {
        employeeId: session.employeeId,
        roleId: session.roleId,
        roleName: role?.name || session.roleName || session.roleId,
        permissions: role?.permissions ?? session.permissions,
        expiresAt: session.expiresAt,
        employee: {
          employee_id: employee.employee_id,
          username: employee.username,
          name: employee.name,
          role: employee.role_id,
          status: employee.status,
          base_branch: employee.base_branch || "",
        },
      },
      claims: {
        employeeId: session.employeeId,
        username: employee.username,
        employeeName: session.employeeName || employee.name,
        roleId: session.roleId,
        roleName: role?.name || session.roleName || session.roleId,
        permissions: role?.permissions ?? session.permissions,
        baseBranch: session.baseBranch || employee.base_branch || "",
      },
    });
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 503 });
  }
}
