import { NextResponse } from 'next/server';
import { withAuth, requireRole } from '@/lib/api-auth';
import { resolveCabang } from '@/lib/google/registry';
import {
  asNum,
  asStr,
  asJson,
  findRowFresh,
  updateRow,
} from '@/lib/store';
import { createClient } from '@supabase/supabase-js';
import { isReportFinal } from '@mochikin/shared/points';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface AuditEntry {
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

export interface ItemFeedback {
  itemId: string;
  pointRef: string;
  comment?: string;
  originalPoints?: number;
  adjustedPoints?: number;
  adjustmentReason?: string;
  auditorId: string;
  auditorName: string;
  updatedAt: string;
}

export interface GeneralFeedback {
  summary?: string;
  notes?: string;
  findings?: string;
  recommendations?: string;
  auditorId: string;
  auditorName: string;
  updatedAt: string;
}

export interface ApprovalFeedback {
  status: 'approved' | 'rejected_revision' | 'rejected_permanent';
  decision: 'approve' | 'reject_with_revision' | 'reject_permanently';
  reason?: string;
  auditorId: string;
  auditorName: string;
  updatedAt: string;
}

/**
 * GET /api/admin/reports/[id]/audit
 * Retrieves all audit history, item feedback, point adjustments, and approval info.
 */
export const GET = withAuth(async (req, ctx) => {
  const pathParts = new URL(req.url).pathname.split('/');
  const reportId = pathParts[pathParts.length - 2];

  try {
    const branchId = ctx.branchIds[0] || '';
    const { spreadsheetId } = await resolveCabang(branchId);
    const hit = await findRowFresh(spreadsheetId, 'Reports', 'id', reportId);

    if (!hit) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
    }

    const reportRow = hit.data;
    const summaryStats = asJson<Record<string, any>>(reportRow['summary_stats']) || {};

    const auditTrail: AuditEntry[] = summaryStats.audit_trail || [];
    const itemFeedback: Record<string, ItemFeedback> = summaryStats.item_feedback || {};
    const generalFeedback: GeneralFeedback | null = summaryStats.general_feedback || null;
    const approvalFeedback: ApprovalFeedback | null = summaryStats.approval_feedback || null;

    return NextResponse.json({
      success: true,
      reportId,
      status: asStr(reportRow['status']) || 'submitted',
      isLocked: asStr(reportRow['is_locked']) === 'TRUE',
      totalPoints: summaryStats.total_points ?? summaryStats.adjusted_points ?? 100,
      originalPoints: summaryStats.original_points ?? 100,
      auditTrail,
      itemFeedback,
      generalFeedback,
      approvalFeedback,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat histori audit';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * POST /api/admin/reports/[id]/audit
 * Executes operational audits: item comments, point adjustments with configuration limits,
 * general audit feedback, approval, and two-tier rejection (revision vs permanent).
 */
export const POST = withAuth(async (req, ctx) => {
  const roleErr = requireRole(ctx, 'admin');
  if (roleErr) return roleErr;

  const pathParts = new URL(req.url).pathname.split('/');
  const reportId = pathParts[pathParts.length - 2];

  let body: {
    action:
      | 'item_comment'
      | 'adjust_point'
      | 'custom_point'
      | 'zero_point'
      | 'undo_zero_point'
      | 'general_feedback'
      | 'approve'
      | 'reject_revision'
      | 'reject_permanent'
      | 'reject';
    pointRef?: string;
    itemId?: string;
    comment?: string;
    points?: number;
    minPoints?: number;
    maxPoints?: number;
    reason?: string;
    note?: string;
    summary?: string;
    findings?: string;
    recommendations?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON valid' }, { status: 400 });
  }

  const { action } = body;
  if (!action) {
    return NextResponse.json({ error: 'Parameter action wajib diisi' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const branchId = ctx.branchIds[0] || '';
    const { spreadsheetId } = await resolveCabang(branchId);

    const hit = await findRowFresh(spreadsheetId, 'Reports', 'id', reportId);
    if (!hit) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
    }

    const reportRow = hit.data;
    const currentStatus = asStr(reportRow['status']) || 'submitted';

    // Permanently rejected or approved reports cannot be modified
    if (currentStatus === 'rejected_permanent') {
      return NextResponse.json(
        { error: 'Laporan sudah ditolak secara permanen dan tidak dapat diubah lagi.' },
        { status: 400 }
      );
    }
    if (action !== 'approve' && action !== 'reject_revision' && action !== 'reject_permanent' && isReportFinal(currentStatus as any)) {
      return NextResponse.json(
        { error: `Laporan sudah dalam status final (${currentStatus}), tidak dapat diaudit.` },
        { status: 400 }
      );
    }

    const summaryStats = asJson<Record<string, any>>(reportRow['summary_stats']) || {};
    const auditTrail: AuditEntry[] = summaryStats.audit_trail || [];
    const itemFeedback: Record<string, ItemFeedback> = summaryStats.item_feedback || {};

    const auditorId = ctx.user.id || 'admin';
    const auditorName = ctx.user.name || ctx.user.username || 'Admin Auditor';
    const nowIso = new Date().toISOString();
    const entryId = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // ------------------------------------------------------------------------
    // A. Item-Level Comments
    // ------------------------------------------------------------------------
    if (action === 'item_comment') {
      const itemKey = body.itemId || body.pointRef;
      const commentText = (body.comment || body.note || '').trim();

      if (!itemKey) {
        return NextResponse.json({ error: 'itemId atau pointRef wajib disertakan' }, { status: 400 });
      }
      if (!commentText) {
        return NextResponse.json({ error: 'Komentar item wajib diisi' }, { status: 400 });
      }

      itemFeedback[itemKey] = {
        itemId: itemKey,
        pointRef: itemKey,
        comment: commentText,
        originalPoints: itemFeedback[itemKey]?.originalPoints ?? 10,
        adjustedPoints: itemFeedback[itemKey]?.adjustedPoints,
        adjustmentReason: itemFeedback[itemKey]?.adjustmentReason,
        auditorId,
        auditorName,
        updatedAt: nowIso,
      };

      const auditRecord: AuditEntry = {
        id: entryId,
        reportId,
        itemId: itemKey,
        pointRef: itemKey,
        action: 'item_comment',
        reason: commentText,
        auditorId,
        auditorName,
        timestamp: nowIso,
        previousState: currentStatus,
        newState: currentStatus,
      };
      auditTrail.push(auditRecord);

      summaryStats.audit_trail = auditTrail;
      summaryStats.item_feedback = itemFeedback;

      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        summary_stats: JSON.stringify(summaryStats),
      });

      if (supabase) {
        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: auditorId,
          action: 'item_comment',
          note: `[${itemKey}] ${commentText}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Komentar item berhasil disimpan',
        itemKey,
        feedback: itemFeedback[itemKey],
      });
    }

    // ------------------------------------------------------------------------
    // B. Point Adjustment with Configuration Range Validation
    // ------------------------------------------------------------------------
    if (action === 'adjust_point' || action === 'custom_point' || action === 'zero_point' || action === 'undo_zero_point') {
      const itemKey = body.itemId || body.pointRef;
      if (!itemKey) {
        return NextResponse.json({ error: 'itemId atau pointRef wajib disertakan' }, { status: 400 });
      }

      const reasonText = (body.reason || body.note || '').trim();
      if (!reasonText) {
        return NextResponse.json(
          { error: 'Alasan penyesuaian poin wajib diisi untuk menjaga integritas audit trail.' },
          { status: 400 }
        );
      }

      const minAllowed = Number(body.minPoints ?? 0);
      const maxAllowed = Number(body.maxPoints ?? 100);

      let targetPoints = 0;
      if (action === 'zero_point') {
        targetPoints = 0;
      } else if (action === 'undo_zero_point') {
        targetPoints = itemFeedback[itemKey]?.originalPoints ?? 10;
      } else {
        if (body.points === undefined || isNaN(Number(body.points))) {
          return NextResponse.json({ error: 'Nilai poin penyesuaian wajib diisi' }, { status: 400 });
        }
        targetPoints = Number(body.points);
      }

      // Range check
      if (targetPoints < minAllowed || targetPoints > maxAllowed) {
        return NextResponse.json(
          {
            error: `Nilai poin ${targetPoints} berada di luar batas konfigurasi item (${minAllowed} s/d ${maxAllowed}).`,
          },
          { status: 400 }
        );
      }

      const originalPoints = itemFeedback[itemKey]?.originalPoints ?? 10;
      const pointsBefore = itemFeedback[itemKey]?.adjustedPoints ?? originalPoints;

      itemFeedback[itemKey] = {
        itemId: itemKey,
        pointRef: itemKey,
        comment: itemFeedback[itemKey]?.comment,
        originalPoints,
        adjustedPoints: targetPoints,
        adjustmentReason: reasonText,
        auditorId,
        auditorName,
        updatedAt: nowIso,
      };

      // Recalculate total points for the report
      let currentTotal = summaryStats.original_points ?? summaryStats.total_points ?? 100;
      if (!summaryStats.original_points) {
        summaryStats.original_points = currentTotal;
      }

      let netDelta = 0;
      for (const key of Object.keys(itemFeedback)) {
        const item = itemFeedback[key];
        if (item.adjustedPoints !== undefined) {
          netDelta += (item.adjustedPoints - (item.originalPoints ?? 10));
        }
      }
      const newTotalPoints = Math.max(0, (summaryStats.original_points || 100) + netDelta);
      summaryStats.total_points = newTotalPoints;
      summaryStats.adjusted_points = newTotalPoints;

      const auditRecord: AuditEntry = {
        id: entryId,
        reportId,
        itemId: itemKey,
        pointRef: itemKey,
        action: 'point_adjustment',
        pointsBefore,
        pointsAfter: targetPoints,
        reason: reasonText,
        auditorId,
        auditorName,
        timestamp: nowIso,
        previousState: currentStatus,
        newState: currentStatus,
      };
      auditTrail.push(auditRecord);

      summaryStats.audit_trail = auditTrail;
      summaryStats.item_feedback = itemFeedback;

      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        summary_stats: JSON.stringify(summaryStats),
      });

      if (supabase) {
        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: auditorId,
          action: 'adjust_point',
          note: `[${itemKey}] ${reasonText}`,
          points_before: pointsBefore,
          points_after: targetPoints,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Poin item ${itemKey} berhasil disesuaikan dari ${pointsBefore} menjadi ${targetPoints}`,
        itemKey,
        pointsBefore,
        pointsAfter: targetPoints,
        totalPoints: newTotalPoints,
        reason: reasonText,
      });
    }

    // ------------------------------------------------------------------------
    // C. General Audit Feedback
    // ------------------------------------------------------------------------
    if (action === 'general_feedback') {
      const summaryText = (body.summary || body.note || '').trim();
      const findingsText = (body.findings || '').trim();
      const recommendationsText = (body.recommendations || '').trim();

      if (!summaryText && !findingsText && !recommendationsText) {
        return NextResponse.json(
          { error: 'Isi ringkasan audit, temuan, atau rekomendasi perbaikan.' },
          { status: 400 }
        );
      }

      const generalFeedback: GeneralFeedback = {
        summary: summaryText,
        notes: body.note?.trim(),
        findings: findingsText,
        recommendations: recommendationsText,
        auditorId,
        auditorName,
        updatedAt: nowIso,
      };

      summaryStats.general_feedback = generalFeedback;

      const auditRecord: AuditEntry = {
        id: entryId,
        reportId,
        action: 'general_feedback',
        reason: summaryText || findingsText,
        auditorId,
        auditorName,
        timestamp: nowIso,
      };
      auditTrail.push(auditRecord);
      summaryStats.audit_trail = auditTrail;

      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        summary_stats: JSON.stringify(summaryStats),
      });

      return NextResponse.json({
        success: true,
        message: 'Feedback audit keseluruhan berhasil disimpan',
        generalFeedback,
      });
    }

    // ------------------------------------------------------------------------
    // D. Approval Workflow
    // ------------------------------------------------------------------------
    if (action === 'approve') {
      const approvalReason = (body.note || body.reason || 'Laporan telah diaudit dan disetujui.').trim();

      const approvalFeedback: ApprovalFeedback = {
        status: 'approved',
        decision: 'approve',
        reason: approvalReason,
        auditorId,
        auditorName,
        updatedAt: nowIso,
      };

      summaryStats.approval_feedback = approvalFeedback;

      const auditRecord: AuditEntry = {
        id: entryId,
        reportId,
        action: 'approve',
        reason: approvalReason,
        auditorId,
        auditorName,
        timestamp: nowIso,
        previousState: currentStatus,
        newState: 'approved',
      };
      auditTrail.push(auditRecord);
      summaryStats.audit_trail = auditTrail;

      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        status: 'approved',
        is_locked: 'TRUE',
        summary_stats: JSON.stringify(summaryStats),
      });

      if (supabase) {
        await supabase.from('reports').upsert({
          id: reportId,
          app_id: 'mycheck',
          branch_id: branchId || '00000000-0000-0000-0000-000000000001',
          period_label: asStr(reportRow['report_number']) || `Laporan ${reportId}`,
          period_start: asStr(reportRow['generated_at']) || nowIso,
          period_end: nowIso,
          status: 'approved',
          created_by: ctx.user.id || '00000000-0000-0000-0000-000000000001',
        });

        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: auditorId,
          action: 'approve',
          note: approvalReason,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan berhasil di-approve final. Poin terkunci permanen.',
        status: 'approved',
        approvalFeedback,
      });
    }

    // ------------------------------------------------------------------------
    // E. Rejection Workflow: Revision vs Permanent
    // ------------------------------------------------------------------------
    if (action === 'reject_revision' || action === 'reject_permanent' || action === 'reject') {
      const isPermanent = action === 'reject_permanent';
      const rejectionReason = (body.reason || body.note || '').trim();

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error: isPermanent
              ? 'Alasan penolakan permanen wajib diisi.'
              : 'Alasan penolakan revisi wajib diisi agar petugas mengetahui bagian yang harus diperbaiki.',
          },
          { status: 400 }
        );
      }

      const nextStatus = isPermanent ? 'rejected_permanent' : 'rejected_revision';
      const isLocked = isPermanent ? 'TRUE' : 'FALSE';

      const approvalFeedback: ApprovalFeedback = {
        status: nextStatus as any,
        decision: isPermanent ? 'reject_permanently' : 'reject_with_revision',
        reason: rejectionReason,
        auditorId,
        auditorName,
        updatedAt: nowIso,
      };

      summaryStats.approval_feedback = approvalFeedback;

      const auditRecord: AuditEntry = {
        id: entryId,
        reportId,
        action: isPermanent ? 'reject_permanent' : 'reject_revision',
        reason: rejectionReason,
        auditorId,
        auditorName,
        timestamp: nowIso,
        previousState: currentStatus,
        newState: nextStatus,
      };
      auditTrail.push(auditRecord);
      summaryStats.audit_trail = auditTrail;

      await updateRow(spreadsheetId, 'Reports', hit.rowNumber, {
        status: nextStatus,
        is_locked: isLocked,
        summary_stats: JSON.stringify(summaryStats),
      });

      if (supabase) {
        await supabase.from('report_audits').insert({
          report_id: reportId,
          auditor_id: auditorId,
          action: isPermanent ? 'reject_permanent' : 'reject_revision',
          note: rejectionReason,
        });
      }

      return NextResponse.json({
        success: true,
        message: isPermanent
          ? 'Laporan ditutup permanen (Rejected Permanently). Petugas tidak dapat mengajukan revisi.'
          : 'Laporan dikembalikan ke petugas untuk revisi (Reject with Revision).',
        status: nextStatus,
        approvalFeedback,
      });
    }

    return NextResponse.json({ error: `Aksi audit tidak dikenal: ${action}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan internal server audit';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
