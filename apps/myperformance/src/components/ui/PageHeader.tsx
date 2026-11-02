import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

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
    <header className="space-y-3 pb-2 border-b border-hairline mb-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {backHref && backLabel ? (
          <>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground font-medium"
            >
              <CaretLeft className="size-3.5" aria-hidden="true" />
              {backLabel}
            </Link>
            <span className="text-border" aria-hidden="true">
              /
            </span>
          </>
        ) : null}
        <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
          {kicker}
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {(badge || meta) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {badge}
              {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ash">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
