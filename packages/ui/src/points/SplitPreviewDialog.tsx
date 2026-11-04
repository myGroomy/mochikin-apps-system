import React, { useState, useEffect } from 'react';

export interface SplitItem {
  id?: string;
  name: string;
  points: number;
}

export interface SplitPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (distributed: { id?: string; name: string; oldPoints: number; newPoints: number }[]) => void;
  items: SplitItem[];
  title?: string;
  initialTotal?: number;
}

export function SplitPreviewDialog({
  isOpen,
  onClose,
  onApply,
  items,
  title = 'Bagi Rata Poin Section / Area',
  initialTotal,
}: SplitPreviewDialogProps) {
  const currentTotal = items.reduce((sum, item) => sum + Math.round((Number(item.points) || 0) * 100), 0) / 100;
  const [targetTotal, setTargetTotal] = useState<number>(initialTotal ?? currentTotal);
  const [decimals, setDecimals] = useState<number>(2);

  useEffect(() => {
    if (isOpen) {
      setTargetTotal(initialTotal !== undefined ? initialTotal : currentTotal);
    }
  }, [isOpen, initialTotal, currentTotal]);

  if (!isOpen) return null;

  const count = items.length;
  const factor = Math.pow(10, decimals);
  const safeTotalUnits = Math.max(0, Math.round(targetTotal * factor));
  const baseUnits = count > 0 ? Math.floor(safeTotalUnits / count) : 0;
  const remainderUnits = count > 0 ? safeTotalUnits - baseUnits * count : 0;

  const preview = items.map((item, idx) => {
    const units = idx === count - 1 ? baseUnits + remainderUnits : baseUnits;
    const newPoints = Number((units / factor).toFixed(decimals));
    return {
      id: item.id,
      name: item.name,
      oldPoints: item.points,
      newPoints,
    };
  });

  const previewSum = preview.reduce((acc, p) => acc + Math.round(p.newPoints * factor), 0) / factor;
  const isExactMatch = Math.abs(previewSum - targetTotal) < 1e-6;

  const handleApply = () => {
    onApply(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500">Membagi rata total poin ke seluruh {count} item secara proporsional.</p>
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

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Poin yang Ingin Dibagi
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="0.5"
                  value={targetTotal}
                  onChange={(e) => setTargetTotal(Math.max(0, Number(e.target.value) || 0))}
                  className="w-32 px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-500 font-medium">poin</span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-xs text-slate-500">Rata-rata per item</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                {count > 0 ? (targetTotal / count).toFixed(2) : '0'} pts
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pratinjau Distribusi ({count} item)
              </span>
              <span className="text-[11px] text-slate-500">
                Total pratinjau: <strong className={isExactMatch ? 'text-emerald-600' : 'text-rose-600'}>{previewSum} pts</strong>
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {preview.map((item, idx) => (
                <div key={item.id ?? idx} className="flex items-center justify-between px-3.5 py-2 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[240px]">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-slate-400 line-through">{item.oldPoints}</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{item.newPoints} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 p-2.5 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
            Perubahan hanya berlaku ke depan. Nilai di shift atau laporan yang sudah berjalan tidak akan terpengaruh.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={count === 0 || !isExactMatch}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors"
          >
            Terapkan ({targetTotal} pts)
          </button>
        </div>
      </div>
    </div>
  );
}
