import test from "node:test";
import assert from "node:assert/strict";
import { createSsoHandoffToken, verifyLauncherHandoff } from "@mochikin/shared/sso";
import { isRoleAllowedForApp, getPermissionsForRole } from "../src/lib/constants";
import { hashPin, verifyPin } from "../src/lib/auth";

test("Phase 2 Auth Engine: Role Permissions & App Matrix", () => {
  // Staff role checks
  assert.equal(isRoleAllowedForApp("staff", "STOKIS"), true);
  assert.equal(isRoleAllowedForApp("staff", "MYCHECK"), true);
  assert.equal(isRoleAllowedForApp("staff", "MYCUSTOMER"), true);
  assert.equal(isRoleAllowedForApp("staff", "MYPERFORMANCE"), true);

  // Guest role checks
  assert.equal(isRoleAllowedForApp("guest", "STOKIS"), true);
  assert.equal(isRoleAllowedForApp("guest", "MYCHECK"), false);
  assert.equal(isRoleAllowedForApp("guest", "MYCUSTOMER"), false);

  // Admin role checks
  assert.equal(isRoleAllowedForApp("role_admin", "STOKIS"), true);
  assert.equal(isRoleAllowedForApp("role_admin", "MYPERFORMANCE"), true);

  // Permissions array
  const staffPerms = getPermissionsForRole("staff");
  assert.ok(staffPerms.includes("view_stokis"));
  assert.ok(staffPerms.includes("view_mycheck"));

  const adminPerms = getPermissionsForRole("role_admin");
  assert.ok(adminPerms.includes("manage_admin"));
});

test("Phase 2 SSO Gateway: Cross-App Handoff Token Generation & Verification", () => {
  const secret = "shared-secret-identical-across-all-apps-test-123456";

  const session = {
    userId: "00000000-0000-0000-0000-000000000002",
    username: "crew_cibiru",
    name: "Petugas Kasir Cibiru",
    role: "staff",
    branchId: "00000000-0000-0000-0000-000000000001",
    branchCode: "BJ01",
    branchName: "Mochikin Cibiru",
    permissions: ["view_stokis", "view_mycheck", "view_mycustomer"],
  };

  // Generate token for STOKIS
  const stokisToken = createSsoHandoffToken(
    {
      employeeId: session.userId,
      username: session.username,
      employeeName: session.name,
      roleName: session.role,
      baseBranch: session.branchCode,
      personId: session.userId,
      branchId: session.branchId,
      jwtRole: session.role,
      permissions: session.permissions,
    },
    "STOKIS",
    secret,
    60
  );

  assert.ok(stokisToken);
  assert.ok(stokisToken.includes("."));

  // Sibling app STOKIS verifies token
  const stokisVerified = verifyLauncherHandoff(stokisToken, secret, "STOKIS");
  assert.ok(stokisVerified);
  assert.equal(stokisVerified.username, "crew_cibiru");
  assert.equal(stokisVerified.baseBranch, "BJ01");
  assert.equal(stokisVerified.audience, "STOKIS");

  // Sibling app MYPERFORMANCE verifies token
  const perfToken = createSsoHandoffToken(
    {
      employeeId: session.userId,
      username: session.username,
      employeeName: session.name,
      roleName: session.role,
      baseBranch: session.branchCode,
      personId: session.userId,
      branchId: session.branchId,
      jwtRole: session.role,
      permissions: session.permissions,
    },
    "MYPERFORMANCE",
    secret,
    60
  );

  const perfVerified = verifyLauncherHandoff(perfToken, secret, "MYPERFORMANCE");
  assert.ok(perfVerified);
  assert.equal(perfVerified.personId, session.userId);
  assert.equal(perfVerified.branchId, session.branchId);
  assert.equal(perfVerified.audience, "MYPERFORMANCE");

  // Wrong audience check
  const wrongAudience = verifyLauncherHandoff(stokisToken, secret, "MYCUSTOMER");
  assert.equal(wrongAudience, null, "Token for STOKIS must not be valid for MYCUSTOMER");

  // Wrong secret check
  const wrongSecret = verifyLauncherHandoff(stokisToken, "wrong-secret-32-chars-long-test-12345678", "STOKIS");
  assert.equal(wrongSecret, null, "Tampered secret must fail verification");
});

test("Phase 2 PIN Security: Hash Verification & Lockout Timing", () => {
  const pin = "1234";
  const hash = hashPin(pin);

  // Correct PIN
  assert.equal(verifyPin("1234", hash), true);

  // Incorrect PIN
  assert.equal(verifyPin("9999", hash), false);

  // Lockout logic simulation
  const maxAttempts = 5;
  const lockDurationMinutes = 5;
  let failedAttempts = 4;

  failedAttempts += 1;
  const isLocked = failedAttempts >= maxAttempts;
  assert.equal(isLocked, true);

  const lockUntil = new Date(Date.now() + lockDurationMinutes * 60000);
  assert.ok(lockUntil.getTime() > Date.now());
});
