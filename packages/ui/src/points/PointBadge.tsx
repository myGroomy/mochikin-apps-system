import React from 'react';

export interface PointBadgeProps {
  points: number | string;
  earned?: boolean;
  zeroed?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  prefix?: string;
  showIcon?: boolean;
}

export function PointBadge({
  points,
  earned = false,
  zeroed = false,
  size = 'sm',
  className = '',
  prefix = '+',
  showIcon = true,
}: PointBadgeProps) {
  const sizeStyles = {
    xs: {
      badge: 'gap-1 px-1.5 py-0.5 text-[11px] rounded-md',
      iconBox: 'size-3.5 rounded-[4px]',
      icon: 'size-2.5',
      ptsText: 'text-[9px]',
    },
    sm: {
      badge: 'gap-1.5 px-2 py-0.5 text-xs rounded-lg',
      iconBox: 'size-4 rounded-md',
      icon: 'size-2.5',
      ptsText: 'text-[10px]',
    },
    md: {
      badge: 'gap-2 px-2.5 py-1 text-sm rounded-lg',
      iconBox: 'size-5 rounded-md',
      icon: 'size-3',
      ptsText: 'text-xs',
    },
    lg: {
      badge: 'gap-2.5 px-3 py-1.5 text-base rounded-xl',
      iconBox: 'size-6 rounded-lg',
      icon: 'size-3.5',
      ptsText: 'text-xs',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.sm;

  let colorClasses = {
    badge: 'border border-slate-200 bg-slate-50/90 text-slate-700 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200',
    iconBox: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };

  if (zeroed) {
    colorClasses = {
      badge: 'border border-rose-200 bg-rose-50/80 text-rose-600 line-through dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400',
      iconBox: 'bg-rose-200 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    };
  } else if (earned) {
    colorClasses = {
      badge: 'border border-emerald-200 bg-emerald-50/90 text-emerald-800 font-semibold shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
      iconBox: 'bg-emerald-600 text-white shadow-2xs dark:bg-emerald-500 dark:text-slate-950',
    };
  }

  const parsed = typeof points === 'number' ? points : parseFloat(String(points ?? '0'));
  const numPoints = typeof parsed === 'number' && !isNaN(parsed) ? parsed : 0;
  const formattedPoints = Number.isInteger(numPoints) ? numPoints : numPoints.toFixed(1);

  return (
    <div
      className={`inline-flex items-center tabular-nums transition-all select-none shrink-0 ${currentSize.badge} ${colorClasses.badge} ${className}`}
      title={zeroed ? 'Poin dinolkan oleh audit' : earned ? 'Poin berhasil didapatkan' : 'Nilai poin item ini'}
    >
      {showIcon && (
        <div
          className={`flex items-center justify-center shrink-0 ${currentSize.iconBox} ${colorClasses.iconBox}`}
          aria-hidden="true"
        >
          <svg
            className={currentSize.icon}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2l2.6 6.9 7.4.4-5.7 4.7 1.8 7.2-6.1-4-6.1 4 1.8-7.2-5.7-4.7 7.4-.4L12 2z" />
          </svg>
        </div>
      )}
      <div className="flex items-baseline gap-0.5 font-bold tracking-tight">
        <span>{zeroed ? '0' : `${prefix}${formattedPoints}`}</span>
        <span className={`font-semibold uppercase tracking-wider opacity-75 ${currentSize.ptsText}`}>
          pts
        </span>
      </div>
    </div>
  );
}

export default PointBadge;

