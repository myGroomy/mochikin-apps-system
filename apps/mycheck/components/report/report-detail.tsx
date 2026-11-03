'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Send, XCircle } from 'lucide-react';
import { PageLoader } from '@/components/ui/QuantumLoader';
import { SkeletonTransition } from '@/components/ui/skeleton-transition';
import type { Snapshot } from '@/lib/db/snapshot';
import { PublicReportView, type PublicReportViewData } from '@/components/report/public-report-view';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface ReportResponse {
  report: {
    id: string;
    report_number: string;
    status: string;
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
  const { user, isAdmin } = useAuth();
  const canAudit = Boolean(isAdmin || user?.role === 'admin');

  const [data, setData] = useState<PublicReportViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zeroedRefs, setZeroedRefs] = useState<Set<string>>(new Set());
  const [customPoints, setCustomPoints] = useState<Map<string, number>>(new Map());
  const [auditing, setAuditing] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>('submitted');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

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
        setReportStatus(result.report.status || (result.report.is_locked ? 'approved' : 'submitted'));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Laporan tidak dapat dimuat.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reportId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
        <SkeletonTransition>
          <PageLoader text="Memuat laporan…" />
        </SkeletonTransition>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-10">
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error ?? 'Laporan tidak ditemukan.'}
        </div>
      </main>
    );
  }

  const handleAuditAction = async (
    action: 'zero_point' | 'undo_zero_point' | 'approve' | 'reject',
    pointRef?: string,
    note?: string
  ) => {
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
        setData((prev) => (prev ? { ...prev, shift: { ...prev.shift, status: 'approved' } } : null));
        setReportStatus('approved');
        toast.success('Laporan berhasil di-approve final');
      } else if (action === 'reject') {
        setData((prev) => (prev ? { ...prev, shift: { ...prev.shift, status: 'revision' } } : null));
        setReportStatus('revision');
        setShowRejectInput(false);
        setRejectNote('');
        toast.success('Laporan dikembalikan ke petugas untuk revisi');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kesalahan audit');
    } finally {
      setAuditing(false);
    }
  };

  const handleCustomizePoint = async (pointRef: string, points: number) => {
    setAuditing(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'custom_point', pointRef, points }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengubah nilai poin');

      setCustomPoints((prev) => new Map(prev).set(pointRef, points));
      toast.success(`Nilai poin item berhasil diubah menjadi ${points} pts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kesalahan audit');
    } finally {
      setAuditing(false);
    }
  };

  const isApproved = reportStatus === 'approved';
  const isRevision = reportStatus === 'revision';

  const footerAuditAction = (
    <section className="break-inside-avoid rounded-2xl border border-border bg-surface p-5 shadow-sm print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">Keputusan Audit Laporan</h2>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approved Final
              </span>
            ) : isRevision ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" /> Revisi Diminta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                <Clock className="h-3.5 w-3.5" /> Menunggu Keputusan
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Tinjau seluruh isi laporan di atas, lalu tentukan persetujuan akhir atau kembalikan untuk revisi.
          </p>
        </div>

        {(zeroedRefs.size > 0 || customPoints.size > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {zeroedRefs.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                ⚠️ {zeroedRefs.size} item dinolkan
              </span>
            )}
            {customPoints.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                ⚙️ {customPoints.size} item disesuaikan
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {!canAudit ? (
          <p className="text-xs text-ink-muted">
            {isApproved
              ? 'Laporan ini telah disetujui (Approved Final) oleh manajemen.'
              : 'Anda login sebagai viewer/petugas. Hanya admin yang memiliki akses untuk menyetujui atau menolak laporan.'}
          </p>
        ) : showRejectInput ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Kirim Permintaan Revisi kepada Petugas
              </p>
            </div>
            <p className="text-xs text-ink-muted">
              Sebutkan poin atau bagian yang perlu diperbaiki oleh petugas shift terkait.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Lampiran foto area dapur kurang jelas, mohon upload ulang..."
              className="w-full rounded-lg border border-border bg-surface p-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              rows={3}
              disabled={auditing}
            />
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectNote('');
                }}
                disabled={auditing}
                className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-canvas transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleAuditAction('reject', undefined, rejectNote)}
                disabled={auditing || !rejectNote.trim()}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Kirim Permintaan Revisi
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-ink-muted">
              {isApproved
                ? 'Laporan ini telah disetujui secara final. Anda tetap dapat meminta revisi jika ditemukan ketidaksesuaian baru.'
                : 'Pilih "Reject (Minta Revisi)" bila ada temuan atau "Approve Final" untuk mengesahkan laporan ini.'}
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                disabled={auditing}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject (Minta Revisi)
              </button>
              <button
                type="button"
                onClick={() => void handleAuditAction('approve')}
                disabled={auditing || isApproved}
                className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 ${
                  isApproved
                    ? 'bg-emerald-700/80 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isApproved ? 'Telah Di-approve' : 'Approve Final'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <PublicReportView
      data={data}
      showCopyLink={false}
      canAudit={canAudit}
      zeroedRefs={zeroedRefs}
      customPoints={customPoints}
      onZeroPoint={(ref, note) => handleAuditAction('zero_point', ref, note)}
      onUndoZero={(ref) => handleAuditAction('undo_zero_point', ref)}
      onCustomizePoint={handleCustomizePoint}
      auditing={auditing}
      footerAuditAction={footerAuditAction}
    />
  );
}
