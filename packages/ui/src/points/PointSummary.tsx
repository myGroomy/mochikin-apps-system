import React from 'react';

export interface PointSummaryProps {
  totalPoints: number;
  contributorsCount?: number;
  itemsDoneCount?: number;
  periodLabel?: string;
  status?: string;
  className?: string;
}

export function PointSummary({
  totalPoints,
  contributorsCount = 1,
  itemsDoneCount,
  periodLabel,
  status,
  className = '',
}: PointSummaryProps) {
  const statusStyles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    under_review: 'bg-amber-50 text-amber-700 border-amber-200',
    revision: 'bg-orange-50 text-orange-700 border-orange-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusBadge = status ? (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
        statusStyles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  ) : null;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Ringkasan Poin
          </h3>
          {periodLabel && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {periodLabel}
            </p>
          )}
        </div>
        {statusBadge}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Poin Sesi
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums dark:text-white">
            {totalPoints}
            <span className="ml-1 text-xs font-normal text-slate-500">pts</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kontributor
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
            {contributorsCount}
            <span className="ml-1 text-xs font-normal text-slate-500">orang</span>
          </p>
        </div>

        {itemsDoneCount !== undefined && (
          <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:col-span-1 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Item Selesai
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {itemsDoneCount}
              <span className="ml-1 text-xs font-normal text-slate-500">item</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
