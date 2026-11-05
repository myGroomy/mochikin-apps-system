import { NextResponse } from "next/server";
import { clearServicesSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearServicesSessionCookie();
  return NextResponse.json({ success: true, message: "Berhasil keluar" });
}

export async function GET(request: Request) {
  await clearServicesSessionCookie();
  return NextResponse.redirect(new URL("/", request.url));
}
