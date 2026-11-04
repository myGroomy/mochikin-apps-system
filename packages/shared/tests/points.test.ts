import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  splitByCategory,
  sumFromItems,
  sumPoints,
  distributePoints,
  validateMasterPoints,
  deriveAdjustmentBounds,
  buildChangeRecord,
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
  it('Method B: splitByCategory supports decimal precision and absorbs remainder', () => {
    // 7 points among 5 items -> [1.4, 1.4, 1.4, 1.4, 1.4]
    const res7_5 = splitByCategory(7, 5);
    assert.deepStrictEqual(res7_5, [1.4, 1.4, 1.4, 1.4, 1.4]);
    assert.strictEqual(sumPoints(res7_5), 7);

    // 10 points among 3 items -> [3.33, 3.33, 3.34]
    const res10_3 = splitByCategory(10, 3);
    assert.deepStrictEqual(res10_3, [3.33, 3.33, 3.34]);
    assert.strictEqual(sumPoints(res10_3), 10);

    // 3 points among 5 items -> [0.6, 0.6, 0.6, 0.6, 0.6]
    const res3_5 = splitByCategory(3, 5);
    assert.deepStrictEqual(res3_5, [0.6, 0.6, 0.6, 0.6, 0.6]);
    assert.strictEqual(sumPoints(res3_5), 3);

    // Single item gets full points
    const resSingle = splitByCategory(10, 1);
    assert.deepStrictEqual(resSingle, [10]);

    // Zero points
    const resZero = splitByCategory(0, 4);
    assert.deepStrictEqual(resZero, [0, 0, 0, 0]);

    // 0 items
    assert.deepStrictEqual(splitByCategory(5, 0), []);
  });

  it('Method A: sumFromItems and sumPoints sum properly without 0-to-1 bugs', () => {
    assert.strictEqual(sumFromItems([2, 3, 5]), 10);
    assert.strictEqual(sumFromItems([]), 0);
    assert.strictEqual(sumFromItems([0, 0]), 0);

    // sumPoints treats 0 as 0, not 1
    assert.strictEqual(sumPoints([0, 0, 0, 0, 3]), 3);
    assert.strictEqual(sumPoints([1.4, 1.4, 1.4, 1.4, 1.4]), 7);
    assert.strictEqual(sumPoints([3.33, 3.33, 3.34]), 10);
    assert.strictEqual(sumPoints([null, undefined, 5, 0]), 5);
  });

  it('distributePoints handles both methods cleanly with decimal precision', () => {
    const methodB = distributePoints('per_category', 10, [1, 1, 1]);
    assert.deepStrictEqual(methodB.distributedPoints, [3.33, 3.33, 3.34]);
    assert.strictEqual(methodB.totalPoints, 10);

    const methodA = distributePoints('per_item', 0, [4, 6, 2]);
    assert.deepStrictEqual(methodA.distributedPoints, [4, 6, 2]);
    assert.strictEqual(methodA.totalPoints, 12);
  });
});

describe('Points - Master Points Validation & Bounds', () => {
  it('validateMasterPoints validates positive numbers and decimal precision', () => {
    assert.strictEqual(validateMasterPoints(5).valid, true);
    assert.strictEqual(validateMasterPoints('2.5').value, 2.5);
    assert.strictEqual(validateMasterPoints(0).valid, true);
    assert.strictEqual(validateMasterPoints(0).value, 0);

    // Negative values
    assert.strictEqual(validateMasterPoints(-1).valid, false);

    // Too many decimals (> 2)
    assert.strictEqual(validateMasterPoints(1.234).valid, false);

    // Exceeds max
    assert.strictEqual(validateMasterPoints(1500, { max: 1000 }).valid, false);

    // Empty or non-number
    assert.strictEqual(validateMasterPoints('').valid, false);
    assert.strictEqual(validateMasterPoints('abc').valid, false);
  });

  it('deriveAdjustmentBounds limits points between 0 and originalPoints', () => {
    const bounds = deriveAdjustmentBounds({ originalPoints: 10 });
    assert.strictEqual(bounds.minPoints, 0);
    assert.strictEqual(bounds.maxPoints, 10);

    const zeroBounds = deriveAdjustmentBounds({ originalPoints: 0 });
    assert.strictEqual(zeroBounds.minPoints, 0);
    assert.strictEqual(zeroBounds.maxPoints, 0);
  });

  it('buildChangeRecord formats change history record correctly', () => {
    const record = buildChangeRecord({
      appId: 'stokis',
      entityType: 'master_item',
      entityRef: 'ITEM-123',
      entityLabel: 'Beras Premium',
      oldPoints: 1.0,
      newPoints: 2.5,
      action: 'set',
      reason: 'Penyesuaian bobot handling',
      changedBy: 'admin_test',
    });

    assert.strictEqual(record.app_id, 'stokis');
    assert.strictEqual(record.entity_type, 'master_item');
    assert.strictEqual(record.entity_ref, 'ITEM-123');
    assert.strictEqual(record.old_points, 1.0);
    assert.strictEqual(record.new_points, 2.5);
    assert.strictEqual(record.action, 'set');
    assert.strictEqual(record.changed_by, 'admin_test');
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

    assert.strictEqual(contributors[2].user_id, 'u3');
    assert.strictEqual(contributors[2].points_earned, 1);
  });

  it('computeAnomalyScore detects outliers with zScore > 2.5', () => {
    const normalAnomaly = computeAnomalyScore(11, 10, 2);
    assert.strictEqual(normalAnomaly.isAnomaly, false);

    const outlierAnomaly = computeAnomalyScore(50, 10, 2);
    assert.strictEqual(outlierAnomaly.isAnomaly, true);
    assert.ok(outlierAnomaly.zScore > 2.5);
  });
});

describe('Points - Audit Flow & Reversibility', () => {
  it('verifies audit permissions by report status', () => {
    assert.strictEqual(canAuditReport('submitted'), true);
    assert.strictEqual(canAuditReport('under_review'), true);
    assert.strictEqual(canAuditReport('approved'), false);
    assert.strictEqual(canAuditReport('rejected'), false);

    assert.strictEqual(isReportFinal('approved'), true);
    assert.strictEqual(isReportFinal('rejected'), true);
    assert.strictEqual(isReportFinal('draft'), false);
    assert.strictEqual(isReportFinal('submitted'), false);
  });

  it('applies zero_point and can undo_zero_point reversibly', () => {
    const log: PointLog = {
      id: 'log-001',
      app_id: 'mycheck',
      user_id: 'u1',
      activity_type: 'checklist',
      points_earned: 5,
      points_original: 5,
      created_at: new Date().toISOString(),
    };

    const { updatedLog, auditEntry } = applyZeroPoint(log, 'auditor-99', 'Foto tidak jelas');
    assert.strictEqual(updatedLog.points_earned, 0);
    assert.strictEqual(auditEntry.action, 'zero_point');
    assert.strictEqual(auditEntry.points_before, 5);
    assert.strictEqual(auditEntry.points_after, 0);

    const reverted = applyUndoZeroPoint(updatedLog, 'auditor-99', 'Foto sudah diklarifikasi');
    assert.strictEqual(reverted.updatedLog.points_earned, 5);
    assert.strictEqual(reverted.auditEntry.action, 'undo_zero_point');
    assert.strictEqual(reverted.auditEntry.points_before, 0);
    assert.strictEqual(reverted.auditEntry.points_after, 5);
  });

  it('creates status audit entry on approve/reject', () => {
    const auditApprove = createReportStatusAudit('rep-001', 'auditor-99', 'approve', 'Semua checklist valid');
    assert.strictEqual(auditApprove.action, 'approve');
    assert.strictEqual(auditApprove.report_id, 'rep-001');
    assert.strictEqual(auditApprove.points_before, null);

    const auditReject = createReportStatusAudit('rep-001', 'auditor-99', 'reject', 'Banyak SOP terlewat');
    assert.strictEqual(auditReject.action, 'reject');
  });
});
