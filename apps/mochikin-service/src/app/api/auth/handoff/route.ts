import { NextRequest, NextResponse } from "next/server";
import { getServicesSession } from "@/lib/auth";
import { isRoleAllowedForApp, type EcosystemAppId } from "@/lib/constants";
import { getAppTargetUrl } from "@/lib/apps";
import { createSsoHandoffToken } from "@mochikin/shared/sso";
import { getMochikinServiceEnv } from "@/lib/env";

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 500);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServicesSession();
    if (!session) {
      return NextResponse.redirect(new URL("/?sso=unauthenticated", request.url));
    }

    const rawAppId = request.nextUrl.searchParams.get("appId");
    if (!rawAppId) {
      return NextResponse.json(
        { success: false, message: "Parameter appId wajib disertakan" },
        { status: 400 }
      );
    }

    const appId = rawAppId.toUpperCase() as EcosystemAppId;

    if (!isRoleAllowedForApp(session.role, appId)) {
      return NextResponse.json(
        {
          success: false,
          message: `Role Anda (${session.role}) tidak memiliki izin mengakses aplikasi ${appId}.`,
        },
        { status: 403 }
      );
    }

    const targetUrl = await getAppTargetUrl(appId);
    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          message: `URL aplikasi ${appId} belum dikonfigurasi di environment Mochikin Services.`,
        },
        { status: 503 }
      );
    }

    const env = getMochikinServiceEnv();
    const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnPath"));

    // Generate signed 60-second handoff token
    const effectiveBranchId = session.activeBranchId || session.branchId;
    const effectiveBranchCode = session.activeBranchCode || session.branchCode;
    const effectiveBranchName = session.activeBranchName || session.branchName;

    const token = createSsoHandoffToken(
      {
        employeeId: session.userId,
        username: session.username,
        employeeName: session.name,
        roleName: session.role,
        baseBranch: effectiveBranchCode,
        personId: session.userId,
        branchId: effectiveBranchId,
        activeBranchId: effectiveBranchId,
        activeBranchCode: effectiveBranchCode,
        activeBranchName: effectiveBranchName,
        jwtRole: session.role,
        permissions: session.permissions,
        portalUrl: request.nextUrl.origin,
      },
      appId,
      env.LAUNCHER_SSO_SHARED_SECRET,
      60 // 60s TTL
    );

    const callbackUrl = new URL("/api/auth/sso/callback", targetUrl).toString();

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const formAction = escapeHtml(callbackUrl);
    const formToken = escapeHtml(token);
    const formReturnPath = escapeHtml(returnPath);
    const safeAppId = escapeHtml(appId);
    const safeBranchCode = escapeHtml(session.branchCode || "PUSAT");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mengarahkan ke ${safeAppId} — Mochikin SSO</title>
  <style>
    :root {
      --color-canvas: #f8f8f8;
      --color-ink: #101214;
      --color-ash: #5c5f66;
      --color-mist: #6b6e76;
      --color-accent: #4D2A00;
      --color-hairline: rgba(16, 18, 20, 0.12);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-canvas);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--color-ink);
      padding: 16px;
    }
    .doppel-outer {
      background: #ffffff;
      border: 1px solid var(--color-hairline);
      border-radius: 24px;
      padding: 4px;
      box-shadow: 0 4px 24px -2px rgba(16, 18, 20, 0.08);
      max-width: 380px;
      width: 100%;
    }
    .doppel-inner {
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(16, 18, 20, 0.04);
    }
    /* Quantum Loader ala Stokis */
    .quantum-loader-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      margin: 0 auto 20px;
    }
    .quantum-pill {
      position: absolute;
      border-radius: 50px;
      box-shadow: inset 0 0 0 3px var(--color-accent);
      animation: loaderAnim 2.5s infinite;
    }
    .quantum-pill.delay {
      animation-delay: -1.25s;
    }
    @keyframes loaderAnim {
      0% { inset: 0 35px 35px 0; }
      12.5% { inset: 0 35px 0 0; }
      25% { inset: 35px 35px 0 0; }
      37.5% { inset: 35px 0 0 0; }
      50% { inset: 35px 0 0 35px; }
      62.5% { inset: 0 0 0 35px; }
      75% { inset: 0 0 35px 35px; }
      87.5% { inset: 0 0 35px 0; }
      100% { inset: 0 35px 35px 0; }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(77, 42, 0, 0.08);
      color: var(--color-accent);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 12px;
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-ink);
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 13px;
      color: var(--color-ash);
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .meta-box {
      width: 100%;
      background: var(--color-canvas);
      border: 1px solid var(--color-hairline);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12px;
      color: var(--color-ash);
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-outlet {
      font-weight: 600;
      color: var(--color-ink);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #15803d;
    }
    button {
      background: var(--color-accent);
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(16, 18, 20, 0.1);
      width: 100%;
    }
    button:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    button:active {
      transform: scale(0.98);
    }
  </style>
</head>
<body>
  <div class="doppel-outer">
    <div class="doppel-inner">
      <div class="quantum-loader-wrap">
        <span class="quantum-pill"></span>
        <span class="quantum-pill delay"></span>
      </div>
      <div class="badge">Single Sign-On</div>
      <div class="title">Menghubungkan ke ${safeAppId}...</div>
      <div class="subtitle">Memverifikasi kredensial & otentikasi sesi ekosistem secara aman</div>
      
      <div class="meta-box">
        <span>Konteks Outlet:</span>
        <span class="meta-outlet"><span class="status-dot"></span>${safeBranchCode}</span>
      </div>

      <form id="ssoForm" method="POST" action="${formAction}">
        <input type="hidden" name="token" value="${formToken}" />
        <input type="hidden" name="returnPath" value="${formReturnPath}" />
        <input type="hidden" name="portalUrl" value="${escapeHtml(request.nextUrl.origin)}" />
        <button type="submit" id="submitBtn">
          Lanjutkan ke ${safeAppId} &rarr;
        </button>
      </form>
    </div>
  </div>
  <script>
    (function() {
      try {
        var form = document.getElementById("ssoForm");
        if (form) form.submit();
      } catch (e) {
        console.error("Auto submit failed:", e);
      }
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("SSO handoff error:", err);
    return NextResponse.json(
      { success: false, message: "Gagal memproses SSO handoff" },
      { status: 500 }
    );
  }
}
