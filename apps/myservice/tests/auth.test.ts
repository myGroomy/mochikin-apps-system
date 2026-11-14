import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}$${hash}`;
}

function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes("$")) return false;
  const [salt, expected] = storedHash.split("$");
  if (!salt || !expected) return false;

  const actual = scryptSync(pin, salt, 32).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

test("MyService Auth: PIN hashing & verification", () => {
  const pin = "1234";
  const stored = hashPin(pin);

  assert.ok(stored.includes("$"));
  assert.equal(verifyPin("1234", stored), true, "Correct PIN should verify");
  assert.equal(verifyPin("0000", stored), false, "Wrong PIN should fail");
  assert.equal(verifyPin("12345", stored), false, "Different length should fail");
  assert.equal(verifyPin("", stored), false, "Empty PIN should fail");
  assert.equal(verifyPin("1234", "invalid_format"), false, "Corrupted hash should fail safely");
});

test("MyService Auth: Stateless Session Token Signing", () => {
  const secret = "a-very-long-test-secret-at-least-32-chars-long";

  interface UserSession {
    userId: string;
    username: string;
    role: string;
    branchId: string;
    expiresAt: number;
  }

  function sign(data: string): string {
    return createHmac("sha256", secret).update(data).digest("base64url");
  }

  function encode(payload: UserSession): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${sign(body)}`;
  }

  function decode(token: string): UserSession | null {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = sign(body);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UserSession;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  }

  const validSession: UserSession = {
    userId: "uuid-123",
    username: "crew_cibiru",
    role: "staff",
    branchId: "uuid-branch-1",
    expiresAt: Date.now() + 3600000,
  };

  const token = encode(validSession);
  const decoded = decode(token);

  assert.ok(decoded);
  assert.equal(decoded.username, "crew_cibiru");
  assert.equal(decoded.role, "staff");

  // Tampered token test
  const tampered = token.slice(0, -3) + "xyz";
  assert.equal(decode(tampered), null, "Tampered token signature must fail");

  // Expired session test
  const expiredSession: UserSession = {
    ...validSession,
    expiresAt: Date.now() - 1000,
  };
  const expiredToken = encode(expiredSession);
  assert.equal(decode(expiredToken), null, "Expired token must be rejected");
});
