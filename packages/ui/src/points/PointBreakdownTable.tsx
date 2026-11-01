import React from 'react';

export interface ContributorRow {
  user_id: string;
  user_name?: string;
  points_earned: number;
  items_count: number;
}

export interface PointBreakdownTableProps {
  contributors: ContributorRow[];
  totalPoints?: number;
  className?: string;
}

export function PointBreakdownTable({
  contributors,
  totalPoints,
  className = '',
}: PointBreakdownTableProps) {
  const sum = totalPoints ?? contributors.reduce((a, b) => a + (Number(b.points_earned) || 0), 0);

  if (!contributors || contributors.length === 0) {
    return (
      <div className={`p-4 text-center text-xs text-slate-500 ${className}`}>
        Belum ada kontributor pada sesi ini.
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Petugas</th>
            <th className="px-4 py-3 text-center">Item Selesai</th>
            <th className="px-4 py-3 text-right">Poin Diperoleh</th>
            <th className="px-4 py-3 text-right">Porsi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {contributors.map((c, index) => {
            const share = sum > 0 ? Math.round((c.points_earned / sum) * 100) : 0;
            return (
              <tr key={c.user_id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <span>{c.user_name || `Petugas (${c.user_id.slice(0, 6)})`}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-600 tabular-nums dark:text-slate-300">
                  {c.items_count}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                  +{c.points_earned} <span className="text-xs font-normal text-slate-500">pts</span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  {share}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
