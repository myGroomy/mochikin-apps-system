import React from 'react';

export interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  itemsCount: number;
  isAnomaly?: boolean;
}

export interface PointDashboardProps {
  appName: string;
  todayPoints: number;
  todayItemsCount: number;
  leaderboard: LeaderboardUser[];
  onAuditShortcut?: () => void;
  className?: string;
}

export function PointDashboard({
  appName,
  todayPoints,
  todayItemsCount,
  leaderboard,
  onAuditShortcut,
  className = '',
}: PointDashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Poin Hari Ini ({appName})</p>
          <p className="mt-2 text-3xl font-black text-slate-900 tabular-nums dark:text-white">
            {todayPoints} <span className="text-sm font-normal text-slate-500">pts</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Total Item Diselesaikan</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {todayItemsCount} <span className="text-sm font-normal text-slate-500">aktivitas</span>
          </p>
        </div>

        {onAuditShortcut && (
          <div className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Audit Antrean</p>
              <p className="mt-1 text-sm text-blue-900 dark:text-blue-200">Periksa laporan shift/SO yang menunggu persetujuan</p>
            </div>
            <button
              type="button"
              onClick={onAuditShortcut}
              className="mt-3 cursor-pointer self-start rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Buka Audit Laporan
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
          Peringkat Petugas ({appName})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold text-slate-500 dark:border-slate-800">
              <tr>
                <th className="py-2 pl-2">Rank</th>
                <th className="py-2">Petugas</th>
                <th className="py-2 text-center">Item Selesai</th>
                <th className="py-2 text-right">Poin Diperoleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {leaderboard.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 pl-2 font-bold text-slate-500">
                    #{user.rank}
                  </td>
                  <td className="py-3 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      {user.isAnomaly && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400" title="Aktivitas di atas rata-rata wajar">
                          ⚠️ Anomaly Flag
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center text-slate-600 tabular-nums dark:text-slate-300">
                    {user.itemsCount}
                  </td>
                  <td className="py-3 text-right font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                    +{user.totalPoints} <span className="text-xs font-normal text-slate-500">pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
