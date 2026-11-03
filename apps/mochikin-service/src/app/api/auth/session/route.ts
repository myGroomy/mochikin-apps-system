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
        id: session.activeBranchId || session.branchId,
        code: session.activeBranchCode || session.branchCode,
        name: session.activeBranchName || session.branchName,
      },
      activeBranchId: session.activeBranchId || session.branchId,
      activeBranchCode: session.activeBranchCode || session.branchCode,
      activeBranchName: session.activeBranchName || session.branchName,
      hasSelectedBranch: session.hasSelectedBranch,
      assignedBranches: session.assignedBranches || [],
      permissions: session.permissions,
      expiresAt: session.expiresAt,
    },
  });
}
