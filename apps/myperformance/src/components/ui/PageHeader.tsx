import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  /** Optional context line rendered after the role badge, e.g. branch name. */
  meta?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

/**
 * Shared page header. Staff and admin pages use the same frame; the role badge
 * and actions are what change, so the product keeps one visual language.
 */
export function PageHeader({
  kicker,
  title,
  description,
  badge,
  meta,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {backHref && backLabel ? (
          <>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-base-content/60 transition-colors hover:text-base-content"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {backLabel}
            </Link>
            <span className="text-base-content/25" aria-hidden="true">
              /
            </span>
          </>
        ) : null}
        <span className="font-medium tracking-wide text-base-content/50">{kicker}</span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {(badge || meta) && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {badge}
              {meta ? <span className="text-xs text-base-content/50">{meta}</span> : null}
            </div>
          )}
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-base-content sm:text-[2rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-base-content/65">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
