import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "neutral" | "primary" | "success" | "warning" | "accent" | "info";

const TONE: Record<StatTone, { wrap: string; icon: string; value: string }> = {
  neutral: {
    wrap: "border-hairline bg-surface",
    icon: "bg-muted text-foreground/70",
    value: "text-foreground",
  },
  primary: {
    wrap: "border-accent/20 bg-accent/5",
    icon: "bg-accent/10 text-accent",
    value: "text-accent",
  },
  info: {
    wrap: "border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    value: "text-indigo-700 dark:text-indigo-300",
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  accent: {
    wrap: "border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    value: "text-indigo-700 dark:text-indigo-300",
  },
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ElementType;
  tone?: StatTone;
  className?: string;
}) {
  const styles = TONE[tone] || TONE.neutral;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-sm",
        styles.wrap,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg shadow-2xs",
              styles.icon
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl font-bold leading-none tracking-tight tabular-nums font-mono",
            styles.value
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>

      {hint ? (
        <div className="mt-2.5 text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
