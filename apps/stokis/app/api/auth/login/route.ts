import { NextResponse } from "next/server";
import { callAppsScript } from "@/lib/appsscript";
import { createSessionToken, setSessionCookieHeader } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    if (!username || !pin) {
      return NextResponse.json(
        { success: false, error: { message: "Username dan PIN wajib diisi" } },
        { status: 400 }
      );
    }

    const result = await callAppsScript("login", undefined, {
      username: username.trim(),
      pin: pin.trim(),
    });

    if (result.success) {
      const token = createSessionToken(result.data);
      const response = NextResponse.json({ success: true, data: result.data });
      response.headers.set("Set-Cookie", setSessionCookieHeader(token));
      return response;
    }

    return NextResponse.json(
      { success: false, error: result.error || { message: "Username atau PIN salah" } },
      { status: 401 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: { message: "Gagal memproses login: " + message } },
      { status: 500 }
    );
  }
}
