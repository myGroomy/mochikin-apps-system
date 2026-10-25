import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { findEmployee, getRole } from "@/lib/server/data";

/**
 * SSO validation endpoint for sibling apps. Sibling apps on separate Vercel
 * hostnames cannot receive the launcher cookie, so they should call this
 * endpoint server-side and use its claims.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const employee = await findEmployee(session.employeeId);
    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json({ authenticated: false, message: "Unauthenticated" }, { status: 401 });
    }

    const role = await getRole(session.roleId);
    const permissions = role?.permissions ?? session.permissions;

    return NextResponse.json({
      authenticated: true,
      session: {
        employeeId: session.employeeId,
        roleId: session.roleId,
        roleName: role?.name || session.roleName || session.roleId,
        permissions,
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
        permissions,
        baseBranch: session.baseBranch || employee.base_branch || "",
      },
    });
  } catch (error) {
    console.error("SSO session lookup failed", error);
    return NextResponse.json(
      { authenticated: false, message: "Authentication service unavailable" },
      { status: 503 }
    );
  }
}
