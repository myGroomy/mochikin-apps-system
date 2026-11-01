'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageLoader } from '@/components/ui/QuantumLoader';
import { SkeletonTransition } from '@/components/ui/skeleton-transition';
import type { Snapshot } from '@/lib/db/snapshot';
import { PublicReportView, type PublicReportViewData } from '@/components/report/public-report-view';
import { AuditPanel } from '@mochikin/ui/points';
import { toast } from 'sonner';

interface ReportResponse {
  report: {
    id: string;
    report_number: string;
    generated_at: string;
    is_locked: boolean;
    archive_pdf_drive_url: string | null;
    archived_photo_count: number | null;
    summary_stats: Record<string, unknown> | null;
  };
  shift: {
    branch_id: string;
    branch_name: string;
    branch_code: string;
    shift_date: string;
    status: string;
    pj_user_id: string;
    pj_name: string | null;
    opened_at: string;
    closed_at: string | null;
    template_snapshot: Snapshot;
  };
  handover: {
    id: string;
    values: unknown;
    freeText: string | null;
    submittedAt: string;
  } | null;
  incidents: Array<{
    id: string;
    categoryName: string;
    description: string;
    status: string;
    occurredAt: string;
  }>;
  entries: Array<{
    pointRef: string;
    state: 'belum' | 'selesai' | 'skip';
    value: string | null;
    skipReason: string | null;
    timingLabel: string | null;
    completedByName: string | null;
    completedAt: string | null;
  }>;
  participants: Array<{ id: string; name: string; isPj: boolean; itemsDone: number }>;
  addenda: Array<{ id: string; note: string; authorName: string; createdAt: string }>;
  photos: Array<{
    id: string;
    ownerType: string;
    ownerId: string;
    mime: string;
    uploadedAt: string;
    status: string;
  }>;
}

export function ReportDetail({ reportId }: { reportId: string }) {
  const [data, setData] = useState<PublicReportViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zeroedRefs, setZeroedRefs] = useState<Set<string>>(new Set());
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          headers: { 'X-Requested-With': 'fetch' },
        });
        const result = (await response.json()) as ReportResponse & { error?: string };
        if (!response.ok) throw new Error(result.error || 'Laporan tidak dapat dimuat.');

        setData({
          branch: { name: result.shift.branch_name, code: result.shift.branch_code },
          shift: {
            shiftDate: result.shift.shift_date,
            status: result.shift.status,
            openedAt: new Date(result.shift.opened_at),
            closedAt: result.shift.closed_at ? new Date(result.shift.closed_at) : null,
            pjName: result.shift.pj_name,
            snapshot: result.shift.template_snapshot,
          },
          report: {
            reportNumber: result.report.report_number,
            generatedAt: new Date(result.report.generated_at),
            isLocked: result.report.is_locked,
            archivePdfDriveUrl: result.report.archive_pdf_drive_url,
            archivedPhotoCount: result.report.archived_photo_count,
            summaryStats: result.report.summary_stats,
          },
          entries: result.entries.map((entry) => ({
            ...entry,
            completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
          })),
          participants: result.participants,
          handover: result.handover
            ? { ...result.handover, submittedAt: new Date(result.handover.submittedAt) }
            : null,
          incidents: result.incidents.map((incident) => ({
            ...incident,
            occurredAt: new Date(incident.occurredAt),
          })),
          addenda: result.addenda.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          })),
          photos: (result.photos ?? []).map((photo) => ({
            ...photo,
            src: `/api/photos/${encodeURIComponent(photo.id)}?reportId=${encodeURIComponent(reportId)}`,
          })),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Laporan tidak dapat dimuat.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reportId]);

  if (loading) {
    return <><main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10"><SkeletonTransition><PageLoader text="Memuat laporan…" /></SkeletonTransition></main></>;
  }

  if (error || !data) {
    return (
      <>
        
        <main className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error ?? 'Laporan tidak ditemukan.'}
          </div>
        </main>
      </>
    );
  }

  const allSnapshotPoints = (data.shift.snapshot?.categories ?? []).flatMap((c) => c.points);
  const auditItems = data.entries
    .filter((e) => e.state === 'selesai' && e.completedByName)
    .map((e) => {
      const pt = allSnapshotPoints.find((p) => p.point_ref === e.pointRef);
      const isZeroed = zeroedRefs.has(e.pointRef);
      const basePoints = pt?.points ?? 1;
      return {
        logId: e.pointRef,
        itemName: pt?.title || e.pointRef,
        userName: e.completedByName || 'Petugas',
        pointsOriginal: basePoints,
        pointsEarned: isZeroed ? 0 : basePoints,
        activityType: 'checklist_item',
      };
    });

  const handleAuditAction = async (action: 'zero_point' | 'undo_zero_point' | 'approve' | 'reject', pointRef?: string, note?: string) => {
    setAuditing(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pointRef, note }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal memproses audit');

      if (action === 'zero_point' && pointRef) {
        setZeroedRefs((prev) => new Set([...prev, pointRef]));
        toast.success('Poin item berhasil dinolkan');
      } else if (action === 'undo_zero_point' && pointRef) {
        setZeroedRefs((prev) => {
          const next = new Set(prev);
          next.delete(pointRef);
          return next;
        });
        toast.success('Poin item berhasil dikembalikan');
      } else if (action === 'approve') {
        setData((prev) => prev ? { ...prev, shift: { ...prev.shift, status: 'approved' } } : null);
        toast.success('Laporan berhasil di-approve final');
      } else if (action === 'reject') {
        setData((prev) => prev ? { ...prev, shift: { ...prev.shift, status: 'revision' } } : null);
        toast.success('Laporan dikembalikan ke petugas untuk revisi');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kesalahan audit');
    } finally {
      setAuditing(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-4 md:px-8 space-y-4 print:hidden">
        <AuditPanel
          reportId={reportId}
          reportStatus={data.shift.status}
          items={auditItems}
          disabled={auditing}
          onZeroPoint={(ref, note) => handleAuditAction('zero_point', ref, note)}
          onUndoZero={(ref) => handleAuditAction('undo_zero_point', ref)}
          onApprove={() => handleAuditAction('approve')}
          onReject={(note) => handleAuditAction('reject', undefined, note)}
        />
      </div>
      <PublicReportView data={data} showCopyLink={false} />
    </>
  );
}
