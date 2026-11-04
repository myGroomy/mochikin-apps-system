import React from 'react';

export interface PointTotalSummaryItem {
  points?: number | string | null;
}

export interface PointTotalSummaryProps {
  items: (PointTotalSummaryItem | number | null | undefined)[];
  title?: string;
  className?: string;
  showZeroWarning?: boolean;
}

export function PointTotalSummary({
  items,
  title = 'Total Poin',
  className = '',
  showZeroWarning = true,
}: PointTotalSummaryProps) {
  let totalUnits = 0;
  let zeroCount = 0;
  const count = items.length;

  for (const item of items) {
    const raw = typeof item === 'object' && item !== null ? item.points : item;
    const num = raw === null || raw === undefined || isNaN(Number(raw)) ? 0 : Math.max(0, Number(raw));
    if (num === 0) {
      zeroCount++;
    }
    totalUnits += Math.round(num * 100);
  }

  const total = Number((totalUnits / 100).toFixed(2));

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 ${className}`}>
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
        <span className="font-medium text-slate-500 dark:text-slate-400">{title}:</span>
        <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
          {total}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          dari {count} item
        </span>
      </div>

      {showZeroWarning && zeroCount > 0 && count > 0 && (
        <div className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200/80 dark:border-amber-900/50">
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{zeroCount} item bernilai 0 poin</span>
        </div>
      )}
    </div>
  );
}
