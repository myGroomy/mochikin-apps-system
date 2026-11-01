import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  splitByCategory,
  sumFromItems,
  distributePoints,
  calculateReportContributors,
  computeAnomalyScore,
  canAuditReport,
  isReportFinal,
  applyZeroPoint,
  applyUndoZeroPoint,
  createReportStatusAudit,
  PointLog,
} from '../src/points';

describe('Points - Distribution Logic (Method A & B)', () => {
  it('Method B: splitByCategory floor + compensate last item', () => {
    // 10 points among 3 items -> floor is 3, remainder is 1 -> [3, 3, 4]
    const res1 = splitByCategory(10, 3);
    assert.deepStrictEqual(res1, [3, 3, 4]);
    assert.strictEqual(sumFromItems(res1), 10);

    // Single item gets full points
    const res2 = splitByCategory(10, 1);
    assert.deepStrictEqual(res2, [10]);

    // Zero points
    const res3 = splitByCategory(0, 4);
    assert.deepStrictEqual(res3, [0, 0, 0, 0]);

    // 0 items
    assert.deepStrictEqual(splitByCategory(10, 0), []);
  });

  it('Method A: sumFromItems sums properly', () => {
    assert.strictEqual(sumFromItems([2, 3, 5]), 10);
    assert.strictEqual(sumFromItems([]), 0);
    assert.strictEqual(sumFromItems([0, 0]), 0);
  });

  it('distributePoints handles both methods cleanly', () => {
    const methodB = distributePoints('per_category', 10, [1, 1, 1]);
    assert.deepStrictEqual(methodB.distributedPoints, [3, 3, 4]);
    assert.strictEqual(methodB.totalPoints, 10);

    const methodA = distributePoints('per_item', 0, [4, 6, 2]);
    assert.deepStrictEqual(methodA.distributedPoints, [4, 6, 2]);
    assert.strictEqual(methodA.totalPoints, 12);
  });
});

describe('Points - Accumulation & Contributor Breakdown', () => {
  it('calculateReportContributors aggregates points and counts per user', () => {
    const executedItems = [
      { userId: 'u1', userName: 'Alice', points: 3 },
      { userId: 'u2', userName: 'Bob', points: 2 },
      { userId: 'u1', userName: 'Alice', points: 4 },
      { userId: 'u3', userName: 'Charlie', points: 1 },
    ];

    const contributors = calculateReportContributors('rep-001', executedItems);
    assert.strictEqual(contributors.length, 3);
    // Highest points first
    assert.strictEqual(contributors[0].user_id, 'u1');
    assert.strictEqual(contributors[0].points_earned, 7);
    assert.strictEqual(contributors[0].items_count, 2);

    assert.strictEqual(contributors[1].user_id, 'u2');
    assert.strictEqual(contributors[1].points_earned, 2);
    assert.strictEqual(contributors[1].items_count, 1);
  });

  it('computeAnomalyScore detects outliers with zScore > 2.5', () => {
    const normal = computeAnomalyScore(12, 10, 2); // z = 1.0
    assert.strictEqual(normal.isAnomaly, false);
    assert.strictEqual(normal.zScore, 1.0);

    const anomaly = computeAnomalyScore(30, 10, 5); // z = 4.0
    assert.strictEqual(anomaly.isAnomaly, true);
    assert.strictEqual(anomaly.zScore, 4.0);

    const zeroStdDev = computeAnomalyScore(10, 10, 0);
    assert.strictEqual(zeroStdDev.isAnomaly, false);
  });
});

describe('Points - Audit Flow & Reversibility', () => {
  it('verifies audit permissions by report status', () => {
    assert.strictEqual(canAuditReport('submitted'), true);
    assert.strictEqual(canAuditReport('under_review'), true);
    assert.strictEqual(canAuditReport('draft'), false);
    assert.strictEqual(canAuditReport('approved'), false);

    assert.strictEqual(isReportFinal('approved'), true);
    assert.strictEqual(isReportFinal('rejected'), true);
    assert.strictEqual(isReportFinal('submitted'), false);
  });

  it('applies zero_point and can undo_zero_point reversibly', () => {
    const mockLog: PointLog = {
      id: 'log-1',
      app_id: 'mycheck',
      user_id: 'user-1',
      branch_id: 'branch-1',
      activity_type: 'checklist_item',
      points_earned: 5,
      points_original: 5,
      report_id: 'rep-1',
    };

    // 1. Zero point
    const { updatedLog: zeroed, auditEntry: zeroEntry } = applyZeroPoint(
      mockLog,
      'auditor-admin',
      'Foto buram'
    );
    assert.strictEqual(zeroed.points_earned, 0);
    assert.strictEqual(zeroed.points_original, 5);
    assert.strictEqual(zeroEntry.action, 'zero_point');
    assert.strictEqual(zeroEntry.points_before, 5);
    assert.strictEqual(zeroEntry.points_after, 0);

    // 2. Undo zero point
    const { updatedLog: restored, auditEntry: undoEntry } = applyUndoZeroPoint(
      zeroed,
      'auditor-admin',
      'Foto sudah dikoreksi'
    );
    assert.strictEqual(restored.points_earned, 5);
    assert.strictEqual(undoEntry.action, 'undo_zero_point');
    assert.strictEqual(undoEntry.points_before, 0);
    assert.strictEqual(undoEntry.points_after, 5);
  });

  it('creates status audit entry on approve/reject', () => {
    const audit = createReportStatusAudit('rep-1', 'admin-1', 'approve', 'Semua checklist OK');
    assert.strictEqual(audit.action, 'approve');
    assert.strictEqual(audit.report_id, 'rep-1');
    assert.strictEqual(audit.auditor_id, 'admin-1');
  });
});
