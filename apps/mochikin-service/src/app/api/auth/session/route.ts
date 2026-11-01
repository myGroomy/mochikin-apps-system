import { NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";

export async function GET() {
  const session = await getServicesSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      username: session.username,
      name: session.name,
      email: session.email,
      role: session.role,
      branch: {
        id: session.branchId,
        code: session.branchCode,
        name: session.branchName,
      },
      permissions: session.permissions,
      expiresAt: session.expiresAt,
    },
  });
}
