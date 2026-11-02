import type { ElementType } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'neutral' | 'locked' | 'error';
  compact?: boolean;
}) {
  const iconTone =
    tone === 'locked'
      ? 'bg-base-200 text-base-content/45'
      : tone === 'error'
        ? 'bg-error/10 text-error'
        : 'bg-base-200 text-base-content/50';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-200/20 text-center ${
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-10'
      }`}
    >
      {Icon ? (
        <span
          className={`inline-flex items-center justify-center rounded-full ${iconTone} ${
            compact ? 'h-8 w-8' : 'h-10 w-10'
          }`}
          aria-hidden="true"
        >
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
      ) : null}
      <div className="space-y-1">
        <h3 className={`font-semibold text-base-content ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-xs leading-relaxed text-base-content/55">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
