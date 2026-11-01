import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPin, setServicesSessionCookie } from "@/lib/auth";
import { getMochikinServiceEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
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

    // Query active person by username or email
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
      .or(`username.ilike.${identity},email.ilike.${identity}`)
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
        const remainingMinutes = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 60000));
        return NextResponse.json(
          {
            success: false,
            message: `Akun terkunci sementara karena terlalu banyak percobaan salah. Silakan coba lagi dalam ${remainingMinutes} menit.`,
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
            ? `Akun terkunci selama ${env.ACCOUNT_LOCK_DURATION_MINUTES} menit karena 5 kali salah PIN.`
            : `Username atau PIN salah. Sisa percobaan: ${remainingAttempts}.`,
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
    const branchCode = branch?.code || "DEFAULT";
    const branchName = branch?.name || "Mochikin Outlet";

    const session = await setServicesSessionCookie({
      userId: person.id,
      username: person.username || identity,
      name: person.name,
      email: person.email,
      role: person.role,
      branchId: person.branch_id,
      branchCode,
      branchName,
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
          id: session.branchId,
          code: session.branchCode,
          name: session.branchName,
        },
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
