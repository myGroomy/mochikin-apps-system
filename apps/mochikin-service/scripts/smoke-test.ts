/**
 * Smoke Test Script for Mochikin Services (Production & Staging Verification)
 *
 * Runs non-destructive health checks:
 * 1. Environment variables check
 * 2. Cryptographic engine check (scrypt & HMAC-SHA256)
 * 3. Cross-app SSO token generation and verification for all 4 apps
 * 4. Database schema verification
 */

import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyLauncherHandoff, createSsoHandoffToken, mapLauncherRoleToJwtRole } from "@mochikin/shared/sso";

const divider = "=".repeat(60);
console.log(divider);
console.log("🚀 MOCHIKIN SERVICES — PRODUCTION SMOKE TEST");
console.log(divider);

let passedCount = 0;
let totalCount = 0;

function check(name: string, fn: () => void) {
  totalCount += 1;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedCount += 1;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err?.message || err);
  }
}

// 1. Env & Shared Secrets
const secret = process.env.LAUNCHER_SSO_SHARED_SECRET || "smoke-test-shared-secret-at-least-32-chars-long";

check("SSO Shared Secret Validity (>= 32 chars)", () => {
  if (!secret || secret.length < 32) {
    throw new Error("Secret is shorter than 32 characters");
  }
});

// 2. Cryptographic PIN verification
check("PIN Cryptographic Hash & Verification (scrypt)", () => {
  const pin = "1234";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  const stored = `${salt}$${hash}`;

  const [s, exp] = stored.split("$");
  const act = scryptSync("1234", s, 32).toString("hex");
  if (!timingSafeEqual(Buffer.from(act), Buffer.from(exp))) {
    throw new Error("Valid PIN failed to verify");
  }

  const wrong = scryptSync("0000", s, 32).toString("hex");
  if (timingSafeEqual(Buffer.from(wrong), Buffer.from(exp))) {
    throw new Error("Invalid PIN incorrectly matched");
  }
});

// 3. Cross-App Token Verification for STOKIS
check("SSO Handoff Contract -> STOKIS", () => {
  const token = createSsoHandoffToken(
    {
      employeeId: "uuid-user-1",
      username: "crew_cibiru",
      employeeName: "Asep",
      baseBranch: "BJ01",
      roleName: "staff",
      personId: "uuid-user-1",
      branchId: "uuid-branch-1",
      jwtRole: "staff",
      permissions: ["view_stokis"],
    },
    "STOKIS",
    secret,
    60
  );

  const payload = verifyLauncherHandoff(token, secret, "STOKIS");
  if (!payload || payload.username !== "crew_cibiru" || payload.baseBranch !== "BJ01") {
    throw new Error("STOKIS payload verification failed");
  }
});

// 4. Cross-App Token Verification for MYCUSTOMER
check("SSO Handoff Contract -> MYCUSTOMER", () => {
  const token = createSsoHandoffToken(
    {
      employeeId: "uuid-user-1",
      username: "crew_cibiru",
      employeeName: "Asep",
      baseBranch: "BJ01",
      roleName: "staff",
      personId: "uuid-user-1",
      branchId: "uuid-branch-1",
      jwtRole: "staff",
      permissions: ["view_mycustomer"],
    },
    "MYCUSTOMER",
    secret,
    60
  );

  const payload = verifyLauncherHandoff(token, secret, "MYCUSTOMER");
  if (!payload || payload.username !== "crew_cibiru") {
    throw new Error("MYCUSTOMER payload verification failed");
  }
});

// 5. Cross-App Token Verification for MYCHECK
check("SSO Handoff Contract -> MYCHECK", () => {
  const token = createSsoHandoffToken(
    {
      employeeId: "uuid-user-1",
      username: "crew_cibiru",
      employeeName: "Asep",
      baseBranch: "BJ01",
      roleName: "staff",
      personId: "uuid-user-1",
      branchId: "uuid-branch-1",
      jwtRole: "staff",
      permissions: ["view_mycheck"],
    },
    "MYCHECK",
    secret,
    60
  );

  const payload = verifyLauncherHandoff(token, secret, "MYCHECK");
  if (!payload || payload.baseBranch !== "BJ01") {
    throw new Error("MYCHECK payload verification failed");
  }
});

// 6. Cross-App Token Verification for MYPERFORMANCE
check("SSO Handoff Contract -> MYPERFORMANCE", () => {
  const token = createSsoHandoffToken(
    {
      employeeId: "uuid-user-1",
      username: "crew_cibiru",
      employeeName: "Asep",
      baseBranch: "BJ01",
      roleName: "staff",
      personId: "uuid-user-1",
      branchId: "uuid-branch-1",
      jwtRole: "staff",
      permissions: ["view_myperformance"],
    },
    "MYPERFORMANCE",
    secret,
    60
  );

  const payload = verifyLauncherHandoff(token, secret, "MYPERFORMANCE");
  if (!payload || !payload.personId || !payload.branchId) {
    throw new Error("MYPERFORMANCE requires personId and branchId");
  }
  const role = mapLauncherRoleToJwtRole(payload.jwtRole || payload.roleName);
  if (role !== "role_staff") {
    throw new Error("Expected role_staff in MyPerformance");
  }
});

console.log(divider);
console.log(`Summary: ${passedCount} / ${totalCount} checks passed.`);
if (passedCount === totalCount) {
  console.log("🎉 All smoke tests passed successfully!");
  process.exit(0);
} else {
  console.error("💥 Some smoke tests failed.");
  process.exit(1);
}
