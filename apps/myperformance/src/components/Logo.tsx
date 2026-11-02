import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export function Logo({ className = "", size = "md", iconOnly = false }: LogoProps) {
  const iconSizes = {
    sm: "size-7",
    md: "size-9",
    lg: "size-11",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Icon Badge */}
      <div
        className={cn(
          iconSizes[size],
          "shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-xs text-white"
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 14l5-5 4 4 7-7" />
          <path d="M14 6h6v6" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <span
            className={cn(
              textSizes[size],
              "font-bold tracking-tight text-ink leading-tight flex items-center gap-1.5"
            )}
          >
            <span>MYPERFORMANCE</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
              Pro
            </span>
          </span>
          <span className="text-[11px] font-medium text-muted-foreground leading-none">
            Points &amp; CARE Scorecard
          </span>
        </div>
      )}
    </div>
  );
}
