import { PointLog, ReportAudit, ReportStatus } from './types';

/**
 * Checks whether a report can undergo administrative audit (zero/undo/approve/reject).
 * Audits are allowed when report is submitted or actively under review.
 */
export function canAuditReport(status: ReportStatus): boolean {
  return status === 'submitted' || status === 'under_review';
}

/**
 * Checks whether a report is final and immutable.
 */
export function isReportFinal(status: ReportStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

/**
 * Zeroes out points for a problematic activity item during report audit.
 * Reversible via applyUndoZeroPoint before final approval.
 */
export function applyZeroPoint(
  log: PointLog,
  auditorId: string,
  note?: string
): { updatedLog: PointLog; auditEntry: Omit<ReportAudit, 'id'> } {
  const pointsBefore = Number(log.points_earned) || 0;
  const pointsAfter = 0;

  const updatedLog: PointLog = {
    ...log,
    points_earned: pointsAfter,
  };

  const auditEntry: Omit<ReportAudit, 'id'> = {
    report_id: log.report_id || '',
    auditor_id: auditorId,
    action: 'zero_point',
    target_log_id: log.id,
    note: note || 'Poin dinolkan oleh auditor',
    points_before: pointsBefore,
    points_after: pointsAfter,
  };

  return { updatedLog, auditEntry };
}

/**
 * Reverts a zeroed-out item back to its original points earned before final approval.
 */
export function applyUndoZeroPoint(
  log: PointLog,
  auditorId: string,
  note?: string
): { updatedLog: PointLog; auditEntry: Omit<ReportAudit, 'id'> } {
  const pointsBefore = Number(log.points_earned) || 0;
  const pointsAfter = Number(log.points_original) || 0;

  const updatedLog: PointLog = {
    ...log,
    points_earned: pointsAfter,
  };

  const auditEntry: Omit<ReportAudit, 'id'> = {
    report_id: log.report_id || '',
    auditor_id: auditorId,
    action: 'undo_zero_point',
    target_log_id: log.id,
    note: note || 'Pembatalan nol poin',
    points_before: pointsBefore,
    points_after: pointsAfter,
  };

  return { updatedLog, auditEntry };
}

/**
 * Generates an audit entry for overall report status transition (e.g. approve or reject).
 */
export function createReportStatusAudit(
  reportId: string,
  auditorId: string,
  action: 'approve' | 'reject' | 'feedback',
  note?: string
): Omit<ReportAudit, 'id'> {
  return {
    report_id: reportId,
    auditor_id: auditorId,
    action,
    target_log_id: null,
    note: note || `Laporan ${action}`,
    points_before: null,
    points_after: null,
  };
}
