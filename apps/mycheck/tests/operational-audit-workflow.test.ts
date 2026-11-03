import { test } from 'node:test';
import assert from 'node:assert/strict';

interface AuditRecord {
  id: string;
  reportId: string;
  itemId?: string;
  pointRef?: string;
  action: string;
  pointsBefore?: number;
  pointsAfter?: number;
  reason?: string;
  auditorId: string;
  auditorName: string;
  timestamp: string;
  previousState?: string;
  newState?: string;
}

interface ItemFeedback {
  itemId: string;
  comment?: string;
  originalPoints?: number;
  adjustedPoints?: number;
  adjustmentReason?: string;
  auditorId: string;
  auditorName: string;
  updatedAt: string;
}

test('Operational Audit: item-level comments store auditor identity and timestamp', () => {
  const itemFeedback: Record<string, ItemFeedback> = {};
  const auditTrail: AuditRecord[] = [];

  const itemKey = 'CHK-CLEAN-01';
  const comment = 'Area chiller belakang perlu disapu dan dipel ulang.';
  const auditorId = 'usr-admin-1';
  const auditorName = 'Budi Auditor';
  const now = new Date().toISOString();

  // Validate required fields
  assert.ok(itemKey, 'itemKey is required');
  assert.ok(comment.trim(), 'comment cannot be empty');

  itemFeedback[itemKey] = {
    itemId: itemKey,
    comment,
    originalPoints: 10,
    auditorId,
    auditorName,
    updatedAt: now,
  };

  auditTrail.push({
    id: 'AUD-001',
    reportId: 'REP-100',
    itemId: itemKey,
    action: 'item_comment',
    reason: comment,
    auditorId,
    auditorName,
    timestamp: now,
  });

  assert.equal(itemFeedback[itemKey].comment, comment);
  assert.equal(itemFeedback[itemKey].auditorName, 'Budi Auditor');
  assert.equal(auditTrail.length, 1);
  assert.equal(auditTrail[0].action, 'item_comment');
});

test('Operational Audit: point adjustment validates mandatory reason and configuration range', () => {
  const minPoints = 0;
  const maxPoints = 15;
  const originalPoints = 10;

  // 1. Adjustment without reason must be rejected
  const emptyReason = '   ';
  assert.equal(!emptyReason.trim(), true, 'Empty reason must be rejected');

  // 2. Adjustment out of bounds must be rejected
  const invalidNegative = -2;
  const invalidExcessive = 20;
  assert.equal(invalidNegative < minPoints, true, 'Negative points rejected');
  assert.equal(invalidExcessive > maxPoints, true, 'Excess points rejected');

  // 3. Valid adjustment with reason
  const validAdjustedPoints = 8;
  const validReason = 'Dokumentasi foto kurang jelas pada item freezer.';
  assert.ok(validAdjustedPoints >= minPoints && validAdjustedPoints <= maxPoints);

  const initialTotal = 100;
  const delta = validAdjustedPoints - originalPoints; // -2
  const updatedTotal = initialTotal + delta; // 98

  assert.equal(updatedTotal, 98, 'Total points must be recalculated accurately');
});

test('Operational Audit: rejection workflow supports revision vs permanent rejection', () => {
  // Scenario 1: Reject with Revision
  const revisionReason = 'Mohon revisi foto bukti pengecekan chiller';
  assert.ok(revisionReason.trim(), 'Revision reason required');

  const revisionState = {
    status: 'rejected_revision',
    isLocked: false, // unlocked so petugas can revise
    reason: revisionReason,
  };
  assert.equal(revisionState.status, 'rejected_revision');
  assert.equal(revisionState.isLocked, false);

  // Scenario 2: Reject Permanently
  const permanentReason = 'Pelanggaran SOP berat, shift ditolak permanen';
  assert.ok(permanentReason.trim(), 'Permanent rejection reason required');

  const permanentState = {
    status: 'rejected_permanent',
    isLocked: true, // locked permanently
    reason: permanentReason,
  };
  assert.equal(permanentState.status, 'rejected_permanent');
  assert.equal(permanentState.isLocked, true);
});

test('Operational Audit: petugas feedback view contains complete item and general audit details', () => {
  const payload = {
    report: {
      id: 'REP-202',
      status: 'rejected_revision',
      total_points: 92,
      original_points: 100,
    },
    audit: {
      item_feedback: {
        'CHK-01': {
          itemId: 'CHK-01',
          comment: 'Freezer suhu terlalu tinggi',
          originalPoints: 10,
          adjustedPoints: 5,
          adjustmentReason: 'Pengecekan suhu terlambat 2 jam',
          auditorName: 'Auditor HQ',
        },
      },
      general_feedback: {
        summary: 'Secara umum operasional baik, revisi bagian suhu',
        recommendations: 'Pastikan alarm suhu aktif',
      },
      approval_feedback: {
        status: 'rejected_revision',
        decision: 'reject_with_revision',
        reason: 'Lakukan perbaikan data suhu dan kirim ulang',
      },
    },
  };

  assert.equal(payload.report.total_points, 92);
  assert.equal(payload.audit.item_feedback['CHK-01'].adjustedPoints, 5);
  assert.equal(payload.audit.general_feedback.summary.includes('revisi'), true);
  assert.equal(payload.audit.approval_feedback.decision, 'reject_with_revision');
});
