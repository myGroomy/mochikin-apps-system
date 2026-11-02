import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { getMochikinServiceEnv } from "./env";
import { getPermissionsForRole } from "./constants";

export const SESSION_COOKIE_NAME = "mochikin_services_session";

export interface ServicesUserSession {
  userId: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  permissions: string[];
  issuedAt: number;
  expiresAt: number;
}

/**
 * Creates a cryptographically salted scrypt hash of a PIN or password.
 * Format: salt$scryptHash
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}$${hash}`;
}

/**
 * Verifies a PIN against a stored salt$scryptHash using timingSafeEqual.
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes("$")) return false;
  const [salt, expected] = storedHash.split("$");
  if (!salt || !expected) return false;

  const actual = scryptSync(pin, salt, 32).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function getSessionSecret(): string {
  const env = getMochikinServiceEnv();
  return env.SESSION_SECRET || env.LAUNCHER_SESSION_SECRET || env.LAUNCHER_SSO_SHARED_SECRET;
}

function signSession(data: string): string {
  return createHmac("sha256", getSessionSecret()).update(data).digest("base64url");
}

export function encodeSessionToken(session: ServicesUserSession): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = signSession(body);
  return `${body}.${signature}`;
}

export function decodeSessionToken(token: string): ServicesUserSession | null {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = signSession(body);
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ServicesUserSession;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current verified session from HTTP-only cookie.
 * Zero database lookup required (pure stateless verification).
 */
export async function getServicesSession(): Promise<ServicesUserSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSessionToken(raw);
}

/**
 * Sets an HTTP-only stateless signed session cookie.
 */
export async function setServicesSessionCookie(
  sessionData: Omit<ServicesUserSession, "issuedAt" | "expiresAt" | "permissions"> & {
    permissions?: string[];
  }
): Promise<ServicesUserSession> {
  const env = getMochikinServiceEnv();
  const now = Date.now();
  const expiresAt = now + env.SESSION_EXPIRES_IN_SECONDS * 1000;

  const session: ServicesUserSession = {
    ...sessionData,
    permissions: sessionData.permissions || getPermissionsForRole(sessionData.role),
    issuedAt: now,
    expiresAt,
  };

  const token = encodeSessionToken(session);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    domain: env.SESSION_COOKIE_DOMAIN || undefined,
    maxAge: env.SESSION_EXPIRES_IN_SECONDS,
  });

  return session;
}

/**
 * Clears the session cookie on logout.
 */
export async function clearServicesSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}
