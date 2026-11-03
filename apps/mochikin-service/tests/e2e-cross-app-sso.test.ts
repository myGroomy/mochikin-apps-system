import test from "node:test";
import assert from "node:assert/strict";
import { createSsoHandoffToken, verifyLauncherHandoff, mapLauncherRoleToJwtRole } from "@mochikin/shared/sso";

test("E2E Cross-App SSO Integration: Mochikin-Services to All 4 Sibling Apps", () => {
  const secret = "shared-secret-must-be-at-least-32-characters-long-test";

  // Mock authenticated session from Mochikin-Services (as produced by setServicesSessionCookie)
  const crewSession = {
    userId: "11111111-1111-1111-1111-111111111111",
    username: "crew_cibiru",
    name: "Asep Sunandar",
    email: "asep@mochikin.id",
    role: "staff",
    branchId: "22222222-2222-2222-2222-222222222222",
    branchCode: "BJ01",
    branchName: "Mochikin Cibiru",
    permissions: ["view_stokis", "view_mycheck", "view_mycustomer", "view_myperformance"],
  };

  const adminSession = {
    userId: "33333333-3333-3333-3333-333333333333",
    username: "admin_hq",
    name: "Admin Mochikin",
    email: "admin@mochikin.id",
    role: "role_admin",
    branchId: "22222222-2222-2222-2222-222222222222",
    branchCode: "BJ01",
    branchName: "Mochikin Cibiru",
    permissions: ["view_stokis", "view_mycheck", "view_mycustomer", "view_myperformance", "manage_admin"],
  };

  // =========================================================================
  // 1. STOKIS Integration Test
  // =========================================================================
  const stokisToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
      personId: crewSession.userId,
      branchId: crewSession.branchId,
      jwtRole: crewSession.role,
      permissions: crewSession.permissions,
    },
    "STOKIS",
    secret,
    60
  );

  const stokisPayload = verifyLauncherHandoff(stokisToken, secret, "STOKIS");
  assert.ok(stokisPayload, "STOKIS must accept token with valid audience");
  assert.equal(stokisPayload.username, "crew_cibiru");
  assert.equal(stokisPayload.baseBranch, "BJ01");
  assert.equal(stokisPayload.employeeName, "Asep Sunandar");

  // =========================================================================
  // 2. MYCUSTOMER Integration Test
  // =========================================================================
  const mycustomerToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
      personId: crewSession.userId,
      branchId: crewSession.branchId,
      jwtRole: crewSession.role,
      permissions: crewSession.permissions,
    },
    "MYCUSTOMER",
    secret,
    60
  );

  const mycustomerPayload = verifyLauncherHandoff(mycustomerToken, secret, "MYCUSTOMER");
  assert.ok(mycustomerPayload, "MYCUSTOMER must accept token");
  const customerRole = mycustomerPayload.roleName.toLowerCase().includes("admin") ? "admin" : "kasir";
  assert.equal(customerRole, "kasir", "Staff role maps to kasir in MyCustomer");

  // Admin user check in MYCUSTOMER
  const adminCustToken = createSsoHandoffToken(
    {
      employeeId: adminSession.userId,
      username: adminSession.username,
      employeeName: adminSession.name,
      roleName: adminSession.role,
      baseBranch: adminSession.branchCode,
      personId: adminSession.userId,
      branchId: adminSession.branchId,
      jwtRole: adminSession.role,
      permissions: adminSession.permissions,
    },
    "MYCUSTOMER",
    secret,
    60
  );
  const adminCustPayload = verifyLauncherHandoff(adminCustToken, secret, "MYCUSTOMER");
  assert.ok(adminCustPayload);
  const adminCustRole = adminCustPayload.roleName.toLowerCase().includes("admin") ? "admin" : "kasir";
  assert.equal(adminCustRole, "admin", "Admin role maps to admin in MyCustomer");

  // =========================================================================
  // 3. MYCHECK Integration Test
  // =========================================================================
  const mycheckToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
      personId: crewSession.userId,
      branchId: crewSession.branchId,
      jwtRole: crewSession.role,
      permissions: crewSession.permissions,
    },
    "MYCHECK",
    secret,
    60
  );

  const mycheckPayload = verifyLauncherHandoff(mycheckToken, secret, "MYCHECK");
  assert.ok(mycheckPayload, "MYCHECK must accept token");
  assert.equal(mycheckPayload.username.toLowerCase(), "crew_cibiru");
  assert.equal(mycheckPayload.baseBranch, "BJ01");

  // =========================================================================
  // 4. MYPERFORMANCE Integration Test
  // =========================================================================
  const myperfToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
      personId: crewSession.userId,
      branchId: crewSession.branchId,
      jwtRole: crewSession.role,
      permissions: crewSession.permissions,
    },
    "MYPERFORMANCE",
    secret,
    60
  );

  const myperfPayload = verifyLauncherHandoff(myperfToken, secret, "MYPERFORMANCE");
  assert.ok(myperfPayload, "MYPERFORMANCE must accept token");
  assert.equal(myperfPayload.personId, crewSession.userId, "MyPerformance requires personId UUID");
  assert.equal(myperfPayload.branchId, crewSession.branchId, "MyPerformance requires branchId UUID");
  const mappedPerfRole = mapLauncherRoleToJwtRole(myperfPayload.jwtRole || myperfPayload.roleName);
  assert.equal(mappedPerfRole, "role_staff", "Staff maps to role_staff in MyPerformance");

  // =========================================================================
  // 5. Negative Security Boundaries
  // =========================================================================
  // Mismatched audience
  assert.equal(
    verifyLauncherHandoff(stokisToken, secret, "MYCHECK"),
    null,
    "Token for STOKIS cannot be redeemed at MYCHECK"
  );

  // Expired token
  const expiredToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
    },
    "STOKIS",
    secret,
    -10 // Expired 10 seconds ago
  );
  assert.equal(
    verifyLauncherHandoff(expiredToken, secret, "STOKIS"),
    null,
    "Expired token must be rejected"
  );

  // =========================================================================
  // 6. Bidirectional Return SSO: Child Apps Back to Portal (SERVICES)
  // =========================================================================
  const returnToken = createSsoHandoffToken(
    {
      employeeId: crewSession.userId,
      username: crewSession.username,
      employeeName: crewSession.name,
      roleName: crewSession.role,
      baseBranch: crewSession.branchCode,
      personId: crewSession.userId,
      branchId: crewSession.branchId,
      jwtRole: crewSession.role,
    },
    "SERVICES",
    secret,
    60
  );

  const returnPayload = verifyLauncherHandoff(
    returnToken,
    secret,
    ["SERVICES", "PORTAL", "MOCHIKIN-SERVICE"]
  );
  assert.ok(returnPayload, "Portal must accept return SSO token from child apps");
  assert.equal(returnPayload.username, crewSession.username);
  assert.equal(returnPayload.employeeName, crewSession.name);
  assert.equal(returnPayload.baseBranch, crewSession.branchCode);
});
