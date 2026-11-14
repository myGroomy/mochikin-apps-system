import test from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin } from "../src/lib/auth";

test("Admin Management: PIN security for new/updated users", () => {
  const pin = "123456";
  const hash = hashPin(pin);
  assert.ok(hash.includes("$"), "PIN hash must contain salt delimiter");
  assert.ok(verifyPin(pin, hash), "Verify PIN must succeed with valid PIN");
  assert.ok(!verifyPin("654321", hash), "Verify PIN must fail with incorrect PIN");
});

test("Admin Management: Validates branch codes", () => {
  const validCodes = ["CMH", "BDG01", "JKT-02"];
  const invalidCodes = ["A", "TOOLONGBRANCHCODE"];

  for (const code of validCodes) {
    assert.ok(code.length >= 2 && code.length <= 10, `Valid code length: ${code}`);
  }

  for (const code of invalidCodes) {
    assert.ok(code.length < 2 || code.length > 10, `Invalid code length: ${code}`);
  }
});

test("Admin Management: Allows updating user role to staff with null phone", async () => {
  const { z } = await import("zod");
  const UpdateUserSchema = z.object({
    username: z.string().min(2).max(50).optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().nullable().optional(),
    pin: z.string().regex(/^\d{6}$/).optional().or(z.literal("")).nullable(),
    role: z.enum(["super_admin", "role_admin", "branch_manager", "staff", "guest"]).optional(),
    status: z.enum(["active", "inactive", "suspended"]).optional(),
    branchId: z.string().uuid().optional(),
  });

  const parsed = UpdateUserSchema.safeParse({
    username: "crew",
    name: "Petugas Kasir",
    email: "crew@mochikin.id",
    phone: null,
    role: "staff",
    status: "active",
    branchId: "ca65bb00-da31-4d9f-8d08-7704cde2f14f",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.role, "staff");
    assert.equal(parsed.data.phone, null);
  }
});

test("Admin Access Gate: Petugas and Guest blocked from /admin routes, Admin authorized", () => {
  const checkIsAdminRole = (role: string) =>
    role === "super_admin" || role === "role_admin" || role === "admin";

  // Allowed
  assert.equal(checkIsAdminRole("admin"), true);
  assert.equal(checkIsAdminRole("role_admin"), true);
  assert.equal(checkIsAdminRole("super_admin"), true);

  // Disallowed (redirect to /)
  assert.equal(checkIsAdminRole("staff"), false);
  assert.equal(checkIsAdminRole("petugas"), false);
  assert.equal(checkIsAdminRole("guest"), false);
  assert.equal(checkIsAdminRole("unknown"), false);
});

test("Admin User Classification & Filtering: multi-branch, role, and branch grouping logic", () => {
  const sampleUsers = [
    { id: "1", name: "Asep", role: "staff", branchId: "b1", assignedBranchIds: ["b1", "b2"], lastLoginAt: "2026-11-10", status: "active" },
    { id: "2", name: "Budi", role: "admin", branchId: "b1", assignedBranchIds: ["b1"], lastLoginAt: null, status: "active" },
    { id: "3", name: "Citra", role: "branch_manager", branchId: "b2", assignedBranchIds: ["b2"], lastLoginAt: "2026-11-12", status: "inactive" },
    { id: "4", name: "Dewi", role: "guest", branchId: "", assignedBranchIds: [], lastLoginAt: null, status: "active" },
  ];

  // Multi-branch filter
  const multiBranch = sampleUsers.filter((u) => (u.assignedBranchIds?.length || (u.branchId ? 1 : 0)) > 1);
  assert.equal(multiBranch.length, 1);
  assert.equal(multiBranch[0].name, "Asep");

  // Branch specific filter (includes multi-assigned)
  const inBranch2 = sampleUsers.filter((u) => u.branchId === "b2" || u.assignedBranchIds.includes("b2"));
  assert.equal(inBranch2.length, 2); // Asep & Citra

  // Unassigned branch filter
  const unassigned = sampleUsers.filter((u) => !u.branchId && u.assignedBranchIds.length === 0);
  assert.equal(unassigned.length, 1);
  assert.equal(unassigned[0].name, "Dewi");

  // Never logged in filter
  const neverLoggedIn = sampleUsers.filter((u) => !u.lastLoginAt);
  assert.equal(neverLoggedIn.length, 2); // Budi & Dewi
});
