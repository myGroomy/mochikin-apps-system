import type { ElementType } from 'react';

type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info';

const TONE: Record<StatTone, { wrap: string; icon: string; value: string }> = {
  neutral: {
    wrap: 'border-base-300 bg-base-100',
    icon: 'bg-base-200 text-base-content/60',
    value: 'text-base-content',
  },
  primary: {
    wrap: 'border-primary/20 bg-primary/[0.04]',
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
  success: {
    wrap: 'border-success/25 bg-success/[0.05]',
    icon: 'bg-success/10 text-success',
    value: 'text-base-content',
  },
  warning: {
    wrap: 'border-warning/30 bg-warning/[0.06]',
    icon: 'bg-warning/15 text-warning',
    value: 'text-base-content',
  },
  info: {
    wrap: 'border-info/25 bg-info/[0.05]',
    icon: 'bg-info/10 text-info',
    value: 'text-base-content',
  },
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon?: ElementType;
  tone?: StatTone;
  className?: string;
}) {
  const styles = TONE[tone];

  return (
    <div className={`card card-static border p-4 sm:p-5 ${styles.wrap} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/55">
          {label}
        </p>
        {Icon ? (
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${styles.icon}`}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={`text-[1.55rem] font-semibold leading-none tracking-tight tabular-nums ${styles.value}`}
        >
          {value}
        </span>
        {unit ? <span className="text-[11px] font-medium text-base-content/50">{unit}</span> : null}
      </div>

      {hint ? <div className="mt-2 text-[11px] leading-relaxed text-base-content/50">{hint}</div> : null}
    </div>
  );
}
