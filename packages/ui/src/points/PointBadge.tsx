import React from 'react';

export interface PointBadgeProps {
  points: number;
  earned?: boolean;
  zeroed?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  prefix?: string;
}

export function PointBadge({
  points,
  earned = false,
  zeroed = false,
  size = 'sm',
  className = '',
  prefix = '+',
}: PointBadgeProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm font-semibold',
  };

  let colorClasses = 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  if (zeroed) {
    colorClasses = 'border border-rose-200 bg-rose-50 text-rose-500 line-through dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400';
  } else if (earned) {
    colorClasses = 'border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold shadow-xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400';
  }

  const formattedPoints = Number.isInteger(points) ? points : Number(points).toFixed(1);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full tabular-nums transition-colors ${sizeClasses[size]} ${colorClasses} ${className}`}
      title={zeroed ? 'Poin dinolkan oleh audit' : earned ? 'Poin berhasil didapatkan' : 'Nilai poin item ini'}
    >
      <span>{zeroed ? '0' : `${prefix}${formattedPoints}`}</span>
      <span className="text-[0.8em] font-normal opacity-80">pts</span>
    </span>
  );
}
