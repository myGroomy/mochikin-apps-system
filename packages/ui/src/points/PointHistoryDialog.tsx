import React from 'react';

export interface HistoryRecord {
  id?: string;
  app_id: string;
  entity_type: string;
  entity_ref: string;
  entity_label?: string | null;
  old_points: number | null;
  new_points: number;
  action: string;
  reason?: string | null;
  changed_by: string;
  changed_at: string;
}

export interface PointHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  history: HistoryRecord[];
  isLoading?: boolean;
}

export function PointHistoryDialog({
  isOpen,
  onClose,
  title = 'Riwayat Perubahan Poin Master',
  history,
  isLoading = false,
}: PointHistoryDialogProps) {
  if (!isOpen) return null;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'set':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">Edit</span>;
      case 'reset':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Reset</span>;
      case 'bulk_split':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Bagi Rata</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500">Catatan audit riwayat perubahan master poin (hanya dibaca).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Memuat riwayat perubahan...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Belum ada riwayat perubahan poin yang tercatat.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {history.map((rec, idx) => (
                <div key={rec.id ?? idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      {getActionBadge(rec.action)}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rec.entity_label || rec.entity_ref}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(rec.changed_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mt-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-400">
                        {rec.old_points !== null && rec.old_points !== undefined ? `${rec.old_points} pts` : '-'}
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {rec.new_points} pts
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Oleh: <strong className="text-slate-700 dark:text-slate-300">{rec.changed_by}</strong>
                    </div>
                  </div>

                  {rec.reason && (
                    <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded">
                      <span className="italic font-normal">Alasan: {rec.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
