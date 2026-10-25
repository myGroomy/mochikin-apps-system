import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mochikin_launcher_session";

export function proxy(request: NextRequest) {
  const protectedPath = request.nextUrl.pathname.startsWith("/launcher") || request.nextUrl.pathname.startsWith("/admin");
  if (protectedPath && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/launcher/:path*", "/admin/:path*"],
};
