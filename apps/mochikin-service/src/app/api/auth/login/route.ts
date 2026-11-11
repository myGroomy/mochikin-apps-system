import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPin, setServicesSessionCookie } from "@/lib/auth";
import { getMochikinServiceEnv } from "@/lib/env";
import { getUserAccessibleBranches } from "@/lib/branchService";
import { getRecommendedShift } from "@/lib/constants";

// Simple in-memory rate limiter for login attempts
// Production should use Redis/Upstash for distributed rate limiting
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - record.count };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak percobaan login. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      username?: string;
      pin?: string;
    } | null;

    const identity = body?.username?.trim().toLowerCase();
    const pin = body?.pin?.trim();

    if (!identity || !pin) {
      return NextResponse.json(
        { success: false, message: "Username dan PIN wajib diisi" },
        { status: 400 }
      );
    }

    const env = getMochikinServiceEnv();
    const supabase = getSupabaseAdmin();

    // Query active person by username, email, full name, or prefix
    const { data: person, error } = await supabase
      .from("people")
      .select(`
        id,
        name,
        email,
        username,
        pin_hash,
        role,
        status,
        failed_attempts,
        locked_until,
        branch_id,
        branches (
          id,
          name,
          code
        )
      `)
      .or(`username.ilike.${identity},email.ilike.${identity},name.ilike.${identity},username.ilike.${identity}%`)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Database query error during login:", error);
      return NextResponse.json(
        { success: false, message: "Layanan autentikasi database bermasalah" },
        { status: 500 }
      );
    }

    if (!person) {
      return NextResponse.json(
        { success: false, message: "Username atau PIN salah" },
        { status: 401 }
      );
    }

    // Check account lockout status
    if (person.locked_until) {
      const lockedUntilMs = new Date(person.locked_until).getTime();
      if (lockedUntilMs > Date.now()) {
        return NextResponse.json(
          {
            success: false,
            message: "Akun terkunci sementara. Silakan coba lagi nanti.",
          },
          { status: 423 }
        );
      }
    }

    // Verify PIN against stored hash
    const isValid = person.pin_hash ? verifyPin(pin, person.pin_hash) : false;

    if (!isValid) {
      const failedAttempts = (person.failed_attempts || 0) + 1;
      const isLocked = failedAttempts >= env.MAX_FAILED_LOGIN_ATTEMPTS;
      const lockUntil = isLocked
        ? new Date(Date.now() + env.ACCOUNT_LOCK_DURATION_MINUTES * 60000).toISOString()
        : null;

      await supabase
        .from("people")
        .update({
          failed_attempts: failedAttempts,
          locked_until: lockUntil,
        })
        .eq("id", person.id);

      const remainingAttempts = Math.max(0, env.MAX_FAILED_LOGIN_ATTEMPTS - failedAttempts);

      return NextResponse.json(
        {
          success: false,
          message: isLocked
            ? `Akun terkunci sementara. Silakan coba lagi nanti.`
            : `Username atau PIN salah.`,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts on success
    await supabase
      .from("people")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", person.id);

    const branch = Array.isArray(person.branches) ? person.branches[0] : person.branches;
    const defaultBranchCode = branch?.code || "DEFAULT";
    const defaultBranchName = branch?.name || "Mochikin Outlet";

    // Map role to standard 'admin' or 'petugas' for full interoperability across Stokis & MyCheck
    const mappedRole =
      person.role === "role_admin" || person.role === "super_admin" || person.role === "admin"
        ? "admin"
        : "petugas";

    // Fetch accessible branches (including multi-branch assignments)
    const accessibleBranches = await getUserAccessibleBranches(
      person.id,
      person.branch_id,
      person.role
    );

    let hasSelectedBranch = false;
    let activeBranch: { id: string; code: string; name: string } | undefined;

    if (accessibleBranches.length <= 1) {
      // Single branch access: auto-select branch, no selector modal needed
      activeBranch = accessibleBranches[0] || {
        id: person.branch_id,
        code: defaultBranchCode,
        name: defaultBranchName,
      };
      hasSelectedBranch = true;
    } else {
      // Multi-branch access: user must select active branch during shift-in
      activeBranch = accessibleBranches.find((b) => b.id === person.branch_id) || accessibleBranches[0];
      hasSelectedBranch = false;
    }

    const recShift = getRecommendedShift();

    const session = await setServicesSessionCookie({
      userId: person.id,
      username: person.username || identity,
      name: person.name,
      email: person.email,
      role: mappedRole,
      branchId: activeBranch.id,
      branchCode: activeBranch.code,
      branchName: activeBranch.name,
      activeBranchId: activeBranch.id,
      activeBranchCode: activeBranch.code,
      activeBranchName: activeBranch.name,
      activeShiftId: recShift.id,
      activeShiftName: recShift.name,
      activeShiftType: recShift.type,
      assignedBranches: accessibleBranches,
      hasSelectedBranch,
      hasSelectedShift: false,
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      user: {
        userId: session.userId,
        username: session.username,
        name: session.name,
        role: session.role,
        branch: {
          id: session.activeBranchId || session.branchId,
          code: session.activeBranchCode || session.branchCode,
          name: session.activeBranchName || session.branchName,
        },
        shift: {
          id: session.activeShiftId,
          name: session.activeShiftName,
          type: session.activeShiftType,
        },
        hasSelectedBranch: session.hasSelectedBranch,
        hasSelectedShift: session.hasSelectedShift,
        assignedBranches: session.assignedBranches || [],
      },
    });
  } catch (err: unknown) {
    console.error("Unexpected error in /api/auth/login:", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
