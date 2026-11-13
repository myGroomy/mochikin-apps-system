import { NextRequest, NextResponse } from "next/server";
import { verifyLauncherHandoff } from "@mochikin/shared/sso";
import { setServicesSessionCookie } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
}

const ALLOWED_AUDIENCES = [
  "SERVICES",
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
      console.warn("Mochikin-Services SSO callback: Token signature or audience verification failed");
      return NextResponse.redirect(new URL("/?sso=invalid", request.url), redirectStatus);
    }

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

    if (person) {
      const branch = Array.isArray(person.branches) ? person.branches[0] : person.branches;
      const mappedRole =
        person.role === "role_admin" || person.role === "super_admin" || person.role === "admin"
          ? "admin"
          : "petugas";

      await setServicesSessionCookie({
        userId: person.id,
        username: person.username || payload.username,
        name: person.name,
        email: person.email,
        role: mappedRole,
        branchId: person.branch_id || payload.branchId || "",
        branchCode: branch?.code || payload.baseBranch || "DEFAULT",
        branchName: branch?.name || "Mochikin Outlet",
      });
    } else {
      // Fallback: construct authenticated session from trusted signed payload
      const mappedRole =
        payload.roleName?.toLowerCase().includes("admin") ||
        payload.jwtRole?.toLowerCase().includes("admin")
          ? "admin"
          : "petugas";

      await setServicesSessionCookie({
        userId: payload.personId || payload.employeeId || "sso-user",
        username: payload.username,
        name: payload.employeeName,
        role: mappedRole,
        branchId: payload.branchId || "",
        branchCode: payload.baseBranch || "DEFAULT",
        branchName: "Mochikin Outlet",
      });
    }

    const targetUrl = new URL(safeReturnPath(returnPath), request.url);
    return NextResponse.redirect(targetUrl, redirectStatus);
  } catch (err: unknown) {
    console.error("SSO callback error in Mochikin-Services:", err);
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
