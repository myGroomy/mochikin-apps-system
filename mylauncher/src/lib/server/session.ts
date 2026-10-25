import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionEnv } from "./env";

const COOKIE_NAME = "mochikin_launcher_session";
const SESSION_SECONDS = Number(process.env.SESSION_EXPIRES_IN_SECONDS || 3600);

function cookieDomain(): string | undefined {
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();
  return domain || undefined;
}

export interface SessionPayload {
  employeeId: string;
  roleId: string;
  permissions: string[];
  expiresAt: number;
  employeeName?: string;
  username?: string;
  baseBranch?: string;
  roleName?: string;
  sessionId?: string;
}

function sign(value: string): string {
  return createHmac("sha256", getSessionEnv().sessionSecret).update(value).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value: string): SessionPayload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = value ? decode(value) : null;
  if (!payload) return null;
  if (payload.sessionId) {
    try {
      const { isSessionRevoked } = await import("./data");
      if (await isSessionRevoked(payload.sessionId)) return null;
    } catch (error) {
      console.error("Session revocation check failed", error);
    }
  }
  return payload;
}

export async function setSession(payload: Omit<SessionPayload, "expiresAt" | "sessionId"> & { sessionId?: string }): Promise<number> {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const sessionId = payload.sessionId ?? crypto.randomUUID();
  const cookiePayload: SessionPayload = {
    ...payload,
    sessionId,
    expiresAt,
  };
  (await cookies()).set(COOKIE_NAME, encode(cookiePayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: SESSION_SECONDS,
  });
  try {
    const { registerSession } = await import("./data");
    await registerSession({
      session_id: sessionId,
      employee_id: payload.employeeId,
      role_id: payload.roleId,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Session register failed", error);
  }
  return expiresAt;
}

export async function clearSession() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
    domain: cookieDomain(),
  });
}

export const sessionCookieName = COOKIE_NAME;
