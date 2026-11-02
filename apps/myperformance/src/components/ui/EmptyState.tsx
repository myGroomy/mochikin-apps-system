import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  compact = false,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "locked" | "error";
  compact?: boolean;
}) {
  const iconTone =
    tone === "locked"
      ? "bg-muted text-muted-foreground"
      : tone === "error"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface/50 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10"
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full shadow-2xs",
            iconTone,
            compact ? "size-9" : "size-11"
          )}
          aria-hidden="true"
        >
          <Icon className={compact ? "size-4" : "size-5"} />
        </span>
      ) : null}
      <div className="space-y-1">
        <h3 className={cn("font-semibold text-ink", compact ? "text-xs" : "text-sm")}>
          {title}
        </h3>
        {description ? (
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
