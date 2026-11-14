import { NextRequest, NextResponse } from "next/server";
import { verifyLauncherHandoff } from "@mochikin/shared/sso";
import { getServicesSession, setServicesSessionCookie } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserAccessibleBranches } from "@/lib/branchService";
import { getRecommendedShift } from "@/lib/constants";
function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
}

const ALLOWED_AUDIENCES = [
  "SERVICES",
  "MYSERVICE",
  "PORTAL",
  "MOCHIKIN-SERVICE",
  "MOCHIKIN_SERVICES",
  "LAUNCHER",
  "MYCHECK",
  "STOKIS",
  "MYCUSTOMER",
  "MYPERFORMANCE",
];

async function handleCallback(
  rawToken: string | null,
  returnPath: string | null,
  request: NextRequest,
  redirectStatus: 303 | 307
) {
  try {
    if (!rawToken) {
      return NextResponse.redirect(new URL("/?sso=invalid", request.url), redirectStatus);
    }

    const payload = verifyLauncherHandoff(rawToken, undefined, ALLOWED_AUDIENCES);
    if (!payload) {
      console.warn("MyService SSO callback: Token signature or audience verification failed");
      return NextResponse.redirect(new URL("/?sso=invalid", request.url), redirectStatus);
    }

    const existingSession = await getServicesSession().catch(() => null);
    const recShift = getRecommendedShift();

    // Try finding person in Supabase to get latest profile and branch info
    const supabase = getSupabaseAdmin();
    let person: any = null;

    if (payload.personId) {
      const { data } = await supabase
        .from("people")
        .select("id, name, username, email, role, branch_id, branches:branches!people_branch_id_fkey(id, code, name)")
        .eq("id", payload.personId)
        .maybeSingle();
      person = data;
    }

    if (!person && payload.username) {
      const { data } = await supabase
        .from("people")
        .select("id, name, username, email, role, branch_id, branches:branches!people_branch_id_fkey(id, code, name)")
        .ilike("username", payload.username.trim())
        .maybeSingle();
      person = data;
    }

    const targetUrl = new URL(safeReturnPath(returnPath), request.url);
    const redirectResponse = NextResponse.redirect(targetUrl, redirectStatus);

    if (person) {
      const branch = Array.isArray(person.branches) ? person.branches[0] : person.branches;
      const mappedRole =
        person.role === "role_admin" || person.role === "super_admin" || person.role === "admin"
          ? "admin"
          : "petugas";

      const accessibleBranches = existingSession?.assignedBranches?.length
        ? existingSession.assignedBranches
        : await getUserAccessibleBranches(person.id, person.branch_id, person.role);

      const activeBranchId =
        existingSession?.activeBranchId ||
        payload.activeBranchId ||
        person.branch_id ||
        payload.branchId ||
        "";
      const activeBranchCode =
        existingSession?.activeBranchCode ||
        payload.activeBranchCode ||
        branch?.code ||
        payload.baseBranch ||
        "DEFAULT";
      const activeBranchName =
        existingSession?.activeBranchName ||
        payload.activeBranchName ||
        branch?.name ||
        "Mochikin Outlet";

      const activeShiftId =
        existingSession?.activeShiftId ||
        payload.activeShiftId ||
        recShift.id;
      const activeShiftName =
        existingSession?.activeShiftName ||
        payload.activeShiftName ||
        recShift.name;
      const activeShiftType =
        existingSession?.activeShiftType ||
        payload.activeShiftType ||
        recShift.type;

      await setServicesSessionCookie(
        {
          userId: person.id,
          username: person.username || payload.username,
          name: person.name,
          email: person.email,
          role: mappedRole,
          branchId: activeBranchId,
          branchCode: activeBranchCode,
          branchName: activeBranchName,
          activeBranchId,
          activeBranchCode,
          activeBranchName,
          activeShiftId,
          activeShiftName,
          activeShiftType,
          assignedBranches: accessibleBranches,
          hasSelectedBranch: true,
          hasSelectedShift: true,
        },
        redirectResponse
      );
    } else {
      // Fallback: construct authenticated session from trusted signed payload
      const mappedRole =
        payload.roleName?.toLowerCase().includes("admin") ||
        payload.jwtRole?.toLowerCase().includes("admin")
          ? "admin"
          : "petugas";

      const activeBranchId =
        existingSession?.activeBranchId ||
        payload.activeBranchId ||
        payload.branchId ||
        "";
      const activeBranchCode =
        existingSession?.activeBranchCode ||
        payload.activeBranchCode ||
        payload.baseBranch ||
        "DEFAULT";
      const activeBranchName =
        existingSession?.activeBranchName ||
        payload.activeBranchName ||
        "Mochikin Outlet";
      const activeShiftId =
        existingSession?.activeShiftId ||
        payload.activeShiftId ||
        recShift.id;
      const activeShiftName =
        existingSession?.activeShiftName ||
        payload.activeShiftName ||
        recShift.name;
      const activeShiftType =
        existingSession?.activeShiftType ||
        payload.activeShiftType ||
        recShift.type;

      await setServicesSessionCookie(
        {
          userId: payload.personId || payload.employeeId || "sso-user",
          username: payload.username,
          name: payload.employeeName,
          role: mappedRole,
          branchId: activeBranchId,
          branchCode: activeBranchCode,
          branchName: activeBranchName,
          activeBranchId,
          activeBranchCode,
          activeBranchName,
          activeShiftId,
          activeShiftName,
          activeShiftType,
          assignedBranches: existingSession?.assignedBranches,
          hasSelectedBranch: true,
          hasSelectedShift: true,
        },
        redirectResponse
      );
    }
    return redirectResponse;
  } catch (err: unknown) {
    console.error("SSO callback error in MyService:", err);
    return NextResponse.redirect(new URL("/?sso=error", request.url), redirectStatus);
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const rawToken = formData?.get("token")?.toString() || null;
  const returnPath = formData?.get("returnPath")?.toString() || null;
  return handleCallback(rawToken, returnPath, request, 303);
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  const returnPath = request.nextUrl.searchParams.get("returnPath");
  return handleCallback(rawToken, returnPath, request, 307);
}
