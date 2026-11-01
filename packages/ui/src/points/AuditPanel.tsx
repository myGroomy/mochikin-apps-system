import React, { useState } from 'react';

export interface AuditItem {
  logId: string;
  itemName: string;
  userName: string;
  pointsOriginal: number;
  pointsEarned: number;
  activityType: string;
}

export interface AuditPanelProps {
  reportId: string;
  reportStatus: string;
  items: AuditItem[];
  onZeroPoint?: (logId: string, note: string) => Promise<void> | void;
  onUndoZero?: (logId: string) => Promise<void> | void;
  onApprove?: () => Promise<void> | void;
  onReject?: (note: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function AuditPanel({
  reportStatus,
  items,
  onZeroPoint,
  onUndoZero,
  onApprove,
  onReject,
  disabled = false,
  className = '',
}: AuditPanelProps) {
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const canAudit = reportStatus === 'submitted' || reportStatus === 'under_review';
  const isFinal = reportStatus === 'approved' || reportStatus === 'rejected';

  async function handleToggleZero(item: AuditItem) {
    if (disabled || !canAudit) return;
    setBusyItem(item.logId);
    try {
      if (item.pointsEarned > 0 && onZeroPoint) {
        await onZeroPoint(item.logId, 'Nol poin oleh audit');
      } else if (item.pointsEarned === 0 && onUndoZero) {
        await onUndoZero(item.logId);
      }
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Panel Audit Laporan</h3>
          <p className="text-xs text-slate-500">
            {canAudit
              ? 'Anda dapat menolkan poin item bermasalah atau menyetujui laporan.'
              : isFinal
              ? 'Laporan sudah dikunci (status final).'
              : 'Laporan masih dalam status draft.'}
          </p>
        </div>
      </div>

      {/* Item Audit List */}
      <div className="space-y-2">
        {items.map((item) => {
          const isZeroed = item.pointsEarned === 0 && item.pointsOriginal > 0;
          return (
            <div
              key={item.logId}
              className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                isZeroed
                  ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
                  : 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30'
              }`}
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className={`text-sm font-medium ${isZeroed ? 'text-rose-700 line-through dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {item.itemName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Dikerjakan oleh <span className="font-medium text-slate-700 dark:text-slate-300">{item.userName}</span> ·{' '}
                  <span className="font-semibold">{item.pointsOriginal} pts</span>
                </p>
              </div>

              {canAudit && (
                <button
                  type="button"
                  onClick={() => handleToggleZero(item)}
                  disabled={disabled || busyItem === item.logId}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isZeroed
                      ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {isZeroed ? 'Batalkan Nol' : 'Nolkan Poin'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision Buttons */}
      {canAudit && (
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          {!showRejectForm ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={disabled}
                className="cursor-pointer rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                Reject (Minta Revisi)
              </button>
              <button
                type="button"
                onClick={() => onApprove?.()}
                disabled={disabled}
                className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve Final
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Tuliskan catatan revisi untuk petugas..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReject?.(rejectNote);
                    setShowRejectForm(false);
                  }}
                  disabled={!rejectNote.trim() || disabled}
                  className="cursor-pointer rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Kirim Revisi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
