import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSsoHandoffToken, verifyLauncherHandoff } from '@mochikin/shared/sso';
import { encodeSessionToken, decodeSessionToken, type ServicesUserSession } from '../src/lib/auth';

const TEST_SECRET = 'a_very_secret_key_that_is_at_least_32_characters_long_12345';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.LAUNCHER_SSO_SHARED_SECRET = TEST_SECRET;

test('Branch Context: single branch user gets auto-selected active branch', () => {
  const session: ServicesUserSession = {
    userId: 'user-single',
    username: 'staff1',
    name: 'Staff Cibiru',
    role: 'petugas',
    branchId: 'branch-1',
    branchCode: 'BJ01',
    branchName: 'Mochikin Cibiru',
    activeBranchId: 'branch-1',
    activeBranchCode: 'BJ01',
    activeBranchName: 'Mochikin Cibiru',
    assignedBranches: [
      { id: 'branch-1', code: 'BJ01', name: 'Mochikin Cibiru', city: 'Bandung' },
    ],
    hasSelectedBranch: true,
    permissions: ['view_dashboard'],
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };

  process.env.LAUNCHER_SSO_SHARED_SECRET = TEST_SECRET;
  const token = encodeSessionToken(session);
  const decoded = decodeSessionToken(token);

  assert.ok(decoded);
  assert.equal(decoded.hasSelectedBranch, true);
  assert.equal(decoded.activeBranchCode, 'BJ01');
  assert.equal(decoded.assignedBranches?.length, 1);
});

test('Branch Context: multi-branch user initially requires shift-in branch selection', () => {
  const session: ServicesUserSession = {
    userId: 'user-multi',
    username: 'captain1',
    name: 'Captain Multicabang',
    role: 'petugas',
    branchId: 'branch-1',
    branchCode: 'BJ01',
    branchName: 'Mochikin Cibiru',
    activeBranchId: 'branch-1',
    activeBranchCode: 'BJ01',
    activeBranchName: 'Mochikin Cibiru',
    assignedBranches: [
      { id: 'branch-1', code: 'BJ01', name: 'Mochikin Cibiru', city: 'Bandung' },
      { id: 'branch-2', code: 'BJ02', name: 'Mochikin Dago', city: 'Bandung' },
    ],
    hasSelectedBranch: false,
    permissions: ['view_dashboard'],
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };

  process.env.LAUNCHER_SSO_SHARED_SECRET = TEST_SECRET;
  const token = encodeSessionToken(session);
  const decoded = decodeSessionToken(token);

  assert.ok(decoded);
  assert.equal(decoded.hasSelectedBranch, false);
  assert.equal(decoded.assignedBranches?.length, 2);

  // Simulating shift-in branch selection to branch-2 (Mochikin Dago)
  const updatedSession: ServicesUserSession = {
    ...decoded,
    branchId: 'branch-2',
    branchCode: 'BJ02',
    branchName: 'Mochikin Dago',
    activeBranchId: 'branch-2',
    activeBranchCode: 'BJ02',
    activeBranchName: 'Mochikin Dago',
    hasSelectedBranch: true,
  };

  const updatedToken = encodeSessionToken(updatedSession);
  const updatedDecoded = decodeSessionToken(updatedToken);

  assert.ok(updatedDecoded);
  assert.equal(updatedDecoded.hasSelectedBranch, true);
  assert.equal(updatedDecoded.activeBranchCode, 'BJ02');
  assert.equal(updatedDecoded.activeBranchName, 'Mochikin Dago');
});

test('Cross-App SSO: active branch context is synchronized across all 4 sibling apps', () => {
  const session: ServicesUserSession = {
    userId: 'user-100',
    username: 'multi_staff',
    name: 'Staf Multi Cabang',
    role: 'admin',
    branchId: 'branch-bdg',
    branchCode: 'BDG01',
    branchName: 'Mochikin Bandung',
    activeBranchId: 'branch-bdg',
    activeBranchCode: 'BDG01',
    activeBranchName: 'Mochikin Bandung',
    assignedBranches: [
      { id: 'branch-bdg', code: 'BDG01', name: 'Mochikin Bandung' },
      { id: 'branch-jkt', code: 'JKT01', name: 'Mochikin Jakarta' },
    ],
    hasSelectedBranch: true,
    permissions: ['*'],
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };

  const targetApps = ['MYCUSTOMER', 'MYCHECK', 'MYPERFORMANCE', 'STOKIS'];

  for (const appId of targetApps) {
    const ssoToken = createSsoHandoffToken(
      {
        employeeId: session.userId,
        username: session.username,
        employeeName: session.name,
        roleName: session.role,
        baseBranch: session.activeBranchCode,
        personId: session.userId,
        branchId: session.activeBranchId,
        activeBranchId: session.activeBranchId,
        activeBranchCode: session.activeBranchCode,
        activeBranchName: session.activeBranchName,
        jwtRole: session.role,
        permissions: session.permissions,
        portalUrl: 'http://localhost:3000',
      },
      appId,
      TEST_SECRET,
      60
    );

    const verified = verifyLauncherHandoff(ssoToken, TEST_SECRET, appId);
    assert.ok(verified, `Token verification failed for app ${appId}`);
    assert.equal(verified.activeBranchCode, 'BDG01');
    assert.equal(verified.baseBranch, 'BDG01');
    assert.equal(verified.activeBranchName, 'Mochikin Bandung');
    assert.equal(verified.personId, 'user-100');
  }
});
