import { createHmac, timingSafeEqual } from 'crypto';

export interface LauncherHandoffPayload {
  audience: string;
  employeeId: string;
  username: string;
  employeeName: string;
  baseBranch: string;
  roleName: string;
  expiresAt: number;
  [key: string]: any;
}

/**
 * Verify Launcher SSO Handoff token.
 * Compatible with mylauncher handoff redirect.
 */
export function verifyLauncherHandoff(
  token: string | null | undefined,
  secretOverride?: string
): LauncherHandoffPayload | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const secret = secretOverride || process.env.LAUNCHER_SSO_SHARED_SECRET;
  if (!secret || secret.length < 32) return null;

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LauncherHandoffPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.expiresAt || payload.expiresAt < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
