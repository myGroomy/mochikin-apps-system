import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { findEmployee } from "@/lib/server/data";
import { getWorkContext } from "@/lib/server/workContext";

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

    const context = await getWorkContext(session.employeeId);
    return NextResponse.json({ workContext: context });
  } catch (error) {
    console.error("Work context lookup failed", error);
    return NextResponse.json({ message: "Work context unavailable" }, { status: 503 });
  }
}
